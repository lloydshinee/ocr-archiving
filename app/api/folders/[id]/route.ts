import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import {
  getUserProfile,
  hasFolderAction,
  canLockFolder,
  isFolderLocked,
  canBypassLock,
} from "@/lib/permission-utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const canView = await hasFolderAction(user.id, id, "view")
    if (!canView) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: folder } = await adminClient
      .from("folders")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 })

    const breadcrumbs = await getFolderBreadcrumbsFromDb(folder)

    return NextResponse.json({ folder, breadcrumbs })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profile = await getUserProfile(user.id)
    if (!profile) return NextResponse.json({ error: "User profile not found" }, { status: 404 })

    const { id } = await params
    const body = await request.json()

    const adminClient = createAdminClient()

    const { data: existing } = await adminClient
      .from("folders")
      .select("id, owner_id, parent_id, program_id, is_locked, inherit_permissions")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!existing) return NextResponse.json({ error: "Folder not found" }, { status: 404 })

    if (body.lock !== undefined) {
      const canLock = await canLockFolder(user.id, id)
      if (!canLock) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

      const { data: updated } = await adminClient
        .from("folders")
        .update({
          is_locked: body.lock,
          locked_by: body.lock ? user.id : null,
          locked_at: body.lock ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single()

      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        action: body.lock ? "lock_folder" : "unlock_folder",
        resource_type: "folder",
        resource_id: id,
      })

      return NextResponse.json({ folder: updated })
    }

    if (body.transferOwnerTo) {
      if (profile.role !== "dean" && profile.role !== "program_head") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
      if (profile.role === "program_head" && existing.program_id !== profile.program_id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      const { data: targetUser } = await adminClient
        .from("users")
        .select("id")
        .eq("id", body.transferOwnerTo)
        .single()

      if (!targetUser) return NextResponse.json({ error: "Target user not found" }, { status: 404 })

      const oldOwnerId = existing.owner_id

      const { data: updated } = await adminClient
        .from("folders")
        .update({ owner_id: body.transferOwnerTo, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        action: "transfer_ownership",
        resource_type: "folder",
        resource_id: id,
        details: { from: oldOwnerId, to: body.transferOwnerTo },
      })

      return NextResponse.json({ folder: updated })
    }

    if (body.inheritPermissions !== undefined) {
      if (profile.role !== "dean") {
        return NextResponse.json({ error: "Only the Dean can change permission inheritance" }, { status: 403 })
      }

      const { data: updated } = await adminClient
        .from("folders")
        .update({ inherit_permissions: body.inheritPermissions, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      return NextResponse.json({ folder: updated })
    }

    const locked = await isFolderLocked(id)
    if (locked && !(await canBypassLock(user.id))) {
      return NextResponse.json({ error: "This folder is locked" }, { status: 403 })
    }

    const canEdit = await hasFolderAction(user.id, id, "edit")
    if (!canEdit) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const { name, parentId } = body

    const updateData: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (parentId !== undefined) {
      const canMove = await hasFolderAction(user.id, id, "move")
      if (!canMove) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

      if (parentId === id) {
        return NextResponse.json({ error: "A folder cannot be moved into itself" }, { status: 400 })
      }
      updateData.parent_id = parentId
    }

    if (Object.keys(updateData).length <= 2) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const { data: folder, error } = await adminClient
      .from("folders")
      .update(updateData as any)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ folder })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profile = await getUserProfile(user.id)
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const url = new URL(request.url)
    const isPermanent = url.searchParams.get("permanent") === "true"

    if (isPermanent && profile.role !== "dean") {
      return NextResponse.json({ error: "Only the Dean can permanently delete items" }, { status: 403 })
    }

    const adminClient = createAdminClient()

    if (isPermanent) {
      const allIds = await collectAllDescendantIds(adminClient, id)

      for (const fid of allIds) {
        const { data: docs } = await adminClient
          .from("documents")
          .select("id")
          .eq("folder_id", fid)

        if (docs) {
          for (const doc of docs) {
            const { data: versions } = await adminClient
              .from("document_versions")
              .select("id, file_path")
              .eq("document_id", doc.id)

            if (versions && versions.length > 0) {
              const paths = versions.map((v) => v.file_path)
              await adminClient.storage.from("documents").remove(paths)
            }

            await adminClient.from("document_tags").delete().eq("document_id", doc.id)
            await adminClient.from("document_versions").delete().eq("document_id", doc.id)
            await adminClient.from("comments").delete().eq("document_id", doc.id)
            await adminClient.from("permissions").delete().eq("document_id", doc.id)
            await adminClient.from("notifications").delete().eq("resource_type", "document").eq("resource_id", doc.id)
            await adminClient.from("documents").delete().eq("id", doc.id)
          }
        }

        await adminClient.from("permissions").delete().eq("folder_id", fid)
        await adminClient.from("notifications").delete().eq("resource_type", "folder").eq("resource_id", fid)
        await adminClient.from("folders").delete().eq("id", fid)

        await adminClient.from("audit_logs").insert({
          user_id: user.id,
          action: "permanent_delete",
          resource_type: "folder",
          resource_id: fid,
        })
      }

      return NextResponse.json({ success: true })
    }

    const canDel = await hasFolderAction(user.id, id, "delete")
    if (!canDel) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const locked = await isFolderLocked(id)
    if (locked && !(await canBypassLock(user.id))) {
      return NextResponse.json({ error: "This folder is locked" }, { status: 403 })
    }

    const now = new Date().toISOString()
    const allIds = await collectAllDescendantIds(adminClient, id)

    for (const fid of allIds) {
      await adminClient
        .from("folders")
        .update({ deleted_at: now, deleted_by: user.id })
        .eq("id", fid)
        .is("deleted_at", null)

      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        action: "delete_folder",
        resource_type: "folder",
        resource_id: fid,
        details: { parent_id: fid === id ? null : id },
      })
    }

    for (const fid of allIds) {
      await adminClient
        .from("documents")
        .update({ deleted_at: now, deleted_by: user.id })
        .eq("folder_id", fid)
        .is("deleted_at", null)

      const { data: folderDocs } = await adminClient
        .from("documents")
        .select("id")
        .eq("folder_id", fid)

      if (folderDocs) {
        for (const doc of folderDocs) {
          await adminClient.from("audit_logs").insert({
            user_id: user.id,
            action: "delete_document",
            resource_type: "document",
            resource_id: doc.id,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function collectAllDescendantIds(
  adminClient: ReturnType<typeof createAdminClient>,
  folderId: string,
): Promise<string[]> {
  const result: string[] = [folderId]
  const { data: children } = await adminClient
    .from("folders")
    .select("id")
    .eq("parent_id", folderId)

  if (children) {
    for (const child of children) {
      const descendants = await collectAllDescendantIds(adminClient, child.id)
      result.push(...descendants)
    }
  }

  return result
}

async function getFolderBreadcrumbsFromDb(
  folder: { id: string; parent_id: string | null; name: string },
): Promise<{ id: string; name: string }[]> {
  const adminClient = createAdminClient()
  const breadcrumbs: { id: string; name: string }[] = []
  let currentId: string | null = folder.parent_id

  const parentChain: { id: string; name: string }[] = []

  while (currentId) {
    const { data: parent } = await adminClient
      .from("folders")
      .select("id, name, parent_id")
      .eq("id", currentId)
      .is("deleted_at", null)
      .single()

    if (!parent) break

    parentChain.unshift({ id: parent.id, name: parent.name })
    currentId = parent.parent_id
  }

  breadcrumbs.push(...parentChain, { id: folder.id, name: folder.name })

  return breadcrumbs
}

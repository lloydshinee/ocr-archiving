import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import {
  hasFolderAction,
  canLockFolder,
  isFolderLocked,
  canBypassLock,
  canManagePermissions,
} from "@/lib/permission-utils"
import { getFolderBreadcrumbsFromDb, collectDescendantIds } from "@/lib/folder-utils"

export const GET = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params

  const adminClient = createAdminClient()

  const canView = await hasFolderAction(adminClient, user.id, id, "view")
  if (!canView) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { data: folder } = await adminClient
      .from("folders")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 })

    const breadcrumbs = await getFolderBreadcrumbsFromDb(adminClient, folder.id)

    return NextResponse.json({ folder, breadcrumbs })
})

export const PATCH = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user, profile } = await requireAuth()

  const { id } = await params
    const body = await request.json()

    const adminClient = createAdminClient()

    const { data: existing } = await adminClient
      .from("folders")
      .select("id, name, owner_id, parent_id, program_id, is_locked, inherit_permissions")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!existing) return NextResponse.json({ error: "Folder not found" }, { status: 404 })

    if (body.lock !== undefined) {
      const canLock = await canLockFolder(adminClient, user.id, id)
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
        details: { item: existing.name },
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
        details: { item: existing.name, from: oldOwnerId, to: body.transferOwnerTo },
      })

      return NextResponse.json({ folder: updated })
    }

    if (body.inheritPermissions !== undefined) {
      const canToggle = await canManagePermissions(adminClient, user.id, id)
      if (!canToggle) {
        return NextResponse.json({ error: "Only the Dean, Program Head, or folder owner can change permission inheritance" }, { status: 403 })
      }

      const { data: updated } = await adminClient
        .from("folders")
        .update({ inherit_permissions: body.inheritPermissions, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      return NextResponse.json({ folder: updated })
    }

    const locked = await isFolderLocked(adminClient, id)
    if (locked && !(await canBypassLock(adminClient, user.id))) {
      return NextResponse.json({ error: "This folder is locked" }, { status: 403 })
    }

    const canEdit = await hasFolderAction(adminClient, user.id, id, "edit")
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

    const oldParentId = existing.parent_id

    if (parentId !== undefined) {
      const isProgramRoot = existing.parent_id === null && existing.program_id !== null
      if (isProgramRoot) {
        return NextResponse.json({ error: "Program root folders cannot be moved" }, { status: 403 })
      }

      const canMove = await hasFolderAction(adminClient, user.id, id, "move")
      if (!canMove) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

      if (parentId === id) {
        return NextResponse.json({ error: "A folder cannot be moved into itself" }, { status: 400 })
      }

      if (parentId === null) {
        const bypass = await canBypassLock(adminClient, user.id)
        if (!bypass) {
          return NextResponse.json({ error: "Only the Dean and Program Heads can move folders to the top level" }, { status: 403 })
        }
      }

      updateData.parent_id = parentId
    }

    if (Object.keys(updateData).length <= 2) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const { data: folder, error } = await adminClient
      .from("folders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updateData as any)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (name !== undefined && name.trim() !== existing.name) {
      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        action: "edit",
        resource_type: "folder",
        resource_id: id,
        details: { item: existing.name, new_name: name.trim() },
      })
    }

    if (parentId !== undefined) {
      const fromName = oldParentId
        ? (await adminClient.from("folders").select("name").eq("id", oldParentId).single()).data?.name
        : null
      const toName = parentId
        ? (await adminClient.from("folders").select("name").eq("id", parentId).single()).data?.name
        : null
      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        action: "move",
        resource_type: "folder",
        resource_id: id,
        details: { item: existing.name, from: fromName ?? "(root)", to: toName ?? "(root)" },
      })
    }

    return NextResponse.json({ folder })
})

export const DELETE = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user, profile } = await requireAuth()

  const { id } = await params
    const url = new URL(request.url)
    const isPermanent = url.searchParams.get("permanent") === "true"

    if (isPermanent && profile.role !== "dean") {
      return NextResponse.json({ error: "Only the Dean can permanently delete items" }, { status: 403 })
    }

    const adminClient = createAdminClient()

    if (isPermanent) {
      const allIds = await collectDescendantIds(adminClient, id)

      const { data: permLocked } = await adminClient
        .from("folders")
        .select("id")
        .in("id", allIds)
        .eq("is_locked", true)
        .is("deleted_at", null)

      if (permLocked && permLocked.length > 0) {
        return NextResponse.json({ error: "Cannot permanently delete a folder containing locked subfolders" }, { status: 403 })
      }

      // Delete children before parents (parent_id FK constraint)
      allIds.reverse()

      for (const fid of allIds) {
        const { data: docs } = await adminClient
          .from("documents")
          .select("id")
          .eq("folder_id", fid)

        if (docs) {
          for (const doc of docs) {
            // Must null out current_version_id before deleting versions (FK constraint)
            await adminClient
              .from("documents")
              .update({ current_version_id: null })
              .eq("id", doc.id)

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

    const canDel = await hasFolderAction(adminClient, user.id, id, "delete")
    if (!canDel) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const locked = await isFolderLocked(adminClient, id)
    if (locked && !(await canBypassLock(adminClient, user.id))) {
      return NextResponse.json({ error: "This folder is locked" }, { status: 403 })
    }

    const allIds = await collectDescendantIds(adminClient, id)

    const { data: lockedDescendants } = await adminClient
      .from("folders")
      .select("id")
      .in("id", allIds)
      .eq("is_locked", true)
      .is("deleted_at", null)

    if (lockedDescendants && lockedDescendants.length > 0) {
      return NextResponse.json({ error: "Cannot delete a folder containing locked subfolders" }, { status: 403 })
    }

    const now = new Date().toISOString()

    const { data: folderRows } = await adminClient
      .from("folders")
      .select("id, name")
      .in("id", allIds)
    const folderNameMap = new Map((folderRows ?? []).map((f) => [f.id, f.name]))

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
        details: { item: folderNameMap.get(fid) ?? "Unknown", parent_id: fid === id ? null : id },
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
        .select("id, title")
        .eq("folder_id", fid)

      if (folderDocs) {
        for (const doc of folderDocs) {
          await adminClient.from("audit_logs").insert({
            user_id: user.id,
            action: "delete_document",
            resource_type: "document",
            resource_id: doc.id,
            details: { item: doc.title },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
})





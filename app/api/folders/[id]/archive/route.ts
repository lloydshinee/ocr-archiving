import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { hasFolderAction, isFolderLocked, canBypassLock } from "@/lib/permission-utils"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { archive } = await request.json()

    if (typeof archive !== "boolean") {
      return NextResponse.json({ error: "archive (boolean) is required" }, { status: 400 })
    }

    const canArchive = await hasFolderAction(user.id, id, "archive")
    if (!canArchive) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const locked = await isFolderLocked(id)
    if (locked && !(await canBypassLock(user.id))) {
      return NextResponse.json({ error: "This folder is locked" }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    if (archive) {
      await archiveFolderWithChildren(adminClient, id, user.id, now)
    } else {
      await unarchiveFolderWithChildren(adminClient, id, now)
    }

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: archive ? "archive_folder" : "unarchive_folder",
      resource_type: "folder",
      resource_id: id,
    })

    const { data: folder } = await adminClient
      .from("folders")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json({ folder })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function archiveFolderWithChildren(
  adminClient: ReturnType<typeof createAdminClient>,
  folderId: string,
  userId: string,
  now: string,
) {
  const allIds = await collectDescendantIds(adminClient, folderId)

  for (const fid of allIds) {
    const { data: folder } = await adminClient
      .from("folders")
      .select("is_archived")
      .eq("id", fid)
      .single()

    await adminClient
      .from("folders")
      .update({
        is_archived: true,
        archived_at: now,
        archived_by: userId,
        db_previously_archived: folder?.is_archived ?? false,
      })
      .eq("id", fid)
  }

  for (const fid of allIds) {
    const { data: docs } = await adminClient
      .from("documents")
      .select("id, is_archived")
      .eq("folder_id", fid)

    if (docs) {
      for (const doc of docs) {
        await adminClient
          .from("documents")
          .update({
            is_archived: true,
            archived_at: now,
            archived_by: userId,
            db_previously_archived: doc.is_archived ?? false,
          })
          .eq("id", doc.id)
      }
    }
  }
}

async function unarchiveFolderWithChildren(
  adminClient: ReturnType<typeof createAdminClient>,
  folderId: string,
  now: string,
) {
  const allIds = await collectDescendantIds(adminClient, folderId)

  for (const fid of allIds) {
    const { data: folder } = await adminClient
      .from("folders")
      .select("db_previously_archived")
      .eq("id", fid)
      .single()

    await adminClient
      .from("folders")
      .update({
        is_archived: folder?.db_previously_archived ?? false,
        archived_at: folder?.db_previously_archived ? undefined : null,
        archived_by: folder?.db_previously_archived ? undefined : null,
        db_previously_archived: false,
      })
      .eq("id", fid)
  }

  for (const fid of allIds) {
    const { data: docs } = await adminClient
      .from("documents")
      .select("id, db_previously_archived")
      .eq("folder_id", fid)

    if (docs) {
      for (const doc of docs) {
        await adminClient
          .from("documents")
          .update({
            is_archived: doc.db_previously_archived ?? false,
            archived_at: doc.db_previously_archived ? undefined : null,
            archived_by: doc.db_previously_archived ? undefined : null,
            db_previously_archived: false,
          })
          .eq("id", doc.id)
      }
    }
  }
}

async function collectDescendantIds(
  adminClient: ReturnType<typeof createAdminClient>,
  folderId: string,
): Promise<string[]> {
  const result: string[] = [folderId]
  const { data: children } = await adminClient
    .from("folders")
    .select("id")
    .eq("parent_id", folderId)
    .is("deleted_at", null)

  if (children) {
    for (const child of children) {
      const descendants = await collectDescendantIds(adminClient, child.id)
      result.push(...descendants)
    }
  }

  return result
}

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { hasFolderAction, isFolderLocked, canBypassLock } from "@/lib/permission-utils"
import { collectDescendantIds } from "@/lib/folder-utils"

export const POST = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params
    const { archive } = await request.json()

    if (typeof archive !== "boolean") {
      return NextResponse.json({ error: "archive (boolean) is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const canArchive = await hasFolderAction(adminClient, user.id, id, "archive")
    if (!canArchive) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const locked = await isFolderLocked(adminClient, id)
    if (locked && !(await canBypassLock(adminClient, user.id))) {
      return NextResponse.json({ error: "This folder is locked" }, { status: 403 })
    }
    const now = new Date().toISOString()

    if (archive) {
      await archiveFolderWithChildren(adminClient, id, user.id, now)
    } else {
      await unarchiveFolderWithChildren(adminClient, id)
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

    if (folder && folder.owner_id !== user.id) {
      await adminClient.from("notifications").insert({
        user_id: folder.owner_id,
        type: "archive",
        title: archive ? "Folder archived" : "Folder unarchived",
        body: `"${folder.name}" was ${archive ? "archived" : "unarchived"}`,
        resource_type: "folder",
        resource_id: id,
      })
    }

    return NextResponse.json({ folder })
})

async function archiveFolderWithChildren(
  adminClient: ReturnType<typeof createAdminClient>,
  folderId: string,
  userId: string,
  now: string,
) {
  const allIds = await collectDescendantIds(adminClient, folderId, { excludeDeleted: true })

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
) {
  const allIds = await collectDescendantIds(adminClient, folderId, { excludeDeleted: true })

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



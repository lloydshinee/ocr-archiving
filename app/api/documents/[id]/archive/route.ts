import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { hasDocumentAction, isFolderLocked, canBypassLock } from "@/lib/permission-utils"

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

    const canArchive = await hasDocumentAction(adminClient, user.id, id, "archive")
    if (!canArchive) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const { data: doc } = await adminClient
      .from("documents")
      .select("folder_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    if (doc.folder_id) {
      const locked = await isFolderLocked(adminClient, doc.folder_id)
      if (locked && !(await canBypassLock(adminClient, user.id))) {
        return NextResponse.json({ error: "The folder containing this document is locked" }, { status: 403 })
      }
    }

    const now = new Date().toISOString()

    const { data: updated } = await adminClient
      .from("documents")
      .update({
        is_archived: archive,
        archived_at: archive ? now : null,
        archived_by: archive ? user.id : null,
      })
      .eq("id", id)
      .select()
      .single()

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: archive ? "archive_document" : "unarchive_document",
      resource_type: "document",
      resource_id: id,
    })

    if (updated && updated.owner_id !== user.id) {
      await adminClient.from("notifications").insert({
        user_id: updated.owner_id,
        type: "archive",
        title: archive ? "Document archived" : "Document unarchived",
        body: `"${updated.title}" was ${archive ? "archived" : "unarchived"}`,
        resource_type: "document",
        resource_id: id,
      })
    }

    return NextResponse.json({ document: updated })
})

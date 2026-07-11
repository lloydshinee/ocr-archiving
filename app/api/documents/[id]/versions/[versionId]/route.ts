import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { hasDocumentAction, isFolderLocked, canBypassLock } from "@/lib/permission-utils"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id, versionId } = await params
    const adminClient = createAdminClient()

    const { data: doc } = await adminClient
      .from("documents")
      .select("id, current_version_id, folder_id, title")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (doc.current_version_id === versionId) {
      return NextResponse.json({ error: "Cannot delete the current version" }, { status: 400 })
    }

    if (doc.folder_id) {
      const locked = await isFolderLocked(adminClient, doc.folder_id)
      if (locked && !(await canBypassLock(adminClient, user.id))) {
        return NextResponse.json({ error: "The folder containing this document is locked" }, { status: 403 })
      }
    }

    const canEdit = await hasDocumentAction(adminClient, user.id, id, "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "You don't have permission to modify this document" }, { status: 403 })
    }

    const { data: version } = await adminClient
      .from("document_versions")
      .select("version_number, file_path")
      .eq("id", versionId)
      .single()

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    await adminClient.storage.from("documents").remove([version.file_path])
    await adminClient.from("ocr_jobs").delete().eq("version_id", versionId)
    await adminClient.from("document_versions").delete().eq("id", versionId)

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "delete_version",
      resource_type: "document",
      resource_id: id,
      details: { deleted_version: version.version_number },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

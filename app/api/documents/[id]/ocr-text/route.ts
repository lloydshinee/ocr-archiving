import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()
  const { id } = await params
  const adminClient = createAdminClient()

  const { data: doc } = await adminClient
    .from("documents")
    .select("id, current_version_id, file_type")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  if (!doc.current_version_id) {
    return NextResponse.json({ error: "No version found" }, { status: 404 })
  }

  const { data: version } = await adminClient
    .from("document_versions")
    .select("ocr_text, ocr_status")
    .eq("id", doc.current_version_id)
    .single()

  if (!version || version.ocr_status !== "completed" || !version.ocr_text) {
    return NextResponse.json({ error: "OCR text not available" }, { status: 404 })
  }

  const raw = version.ocr_text

  const pages = raw.includes("\f")
    ? raw.split("\f").filter(Boolean)
    : [raw]

  return NextResponse.json({ text: raw, pages, versionId: doc.current_version_id })
})

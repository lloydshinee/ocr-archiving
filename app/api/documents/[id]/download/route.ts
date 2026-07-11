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

    const { searchParams } = new URL(request.url)
    const versionId = searchParams.get("version")

    const { data: doc } = await adminClient
      .from("documents")
      .select("id, file_name, current_version_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const lookupVersionId = versionId ?? doc.current_version_id

    if (!lookupVersionId) {
      return NextResponse.json(
        { error: "No version specified" },
        { status: 400 },
      )
    }

    const { data: version } = await adminClient
      .from("document_versions")
      .select("file_path, file_type, file_size")
      .eq("id", lookupVersionId)
      .single()

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    const { data: file, error } = await adminClient.storage
      .from("documents")
      .download(version.file_path)

    if (error || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "download",
      resource_type: "document",
      resource_id: id,
      details: { file_name: doc.file_name, version_path: version.file_path },
    })

    const headers = new Headers()
    headers.set("Content-Type", version.file_type)
    headers.set("Content-Disposition", `attachment; filename="${doc.file_name}"`)
    headers.set("Content-Length", version.file_size.toString())

    return new NextResponse(file, { headers })
})

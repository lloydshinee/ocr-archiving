import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const adminClient = createAdminClient()

    const { data: doc } = await adminClient
      .from("documents")
      .select("id, file_name, current_version_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const { data: version } = await adminClient
      .from("document_versions")
      .select("file_path, file_type, file_size")
      .eq("id", doc.current_version_id!)
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const POST = withErrorHandling(async (request: Request) => {
  const { user } = await requireAuth()

  const contentType = request.headers.get("content-type") || ""
  let versionId: string | null = null

  if (contentType.includes("application/json")) {
    const body = await request.json()
    versionId = body.versionId
  } else {
    const formData = await request.formData()
    versionId = formData.get("versionId") as string | null
  }

  if (!versionId) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: version } = await adminClient
    .from("document_versions")
    .select("id, document_id, ocr_status")
    .eq("id", versionId)
    .single()

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 })
  }

  await adminClient
    .from("document_versions")
    .update({ ocr_status: "pending" })
    .eq("id", version.id)

  await adminClient.from("ocr_jobs").insert({
    version_id: version.id,
    document_id: version.document_id,
    status: "pending",
  })

  return NextResponse.json({ success: true })
})

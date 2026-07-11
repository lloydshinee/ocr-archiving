import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const POST = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params

  const adminClient = createAdminClient()

    const { data: doc } = await adminClient
      .from("documents")
      .select("*")
      .eq("id", id)
      .not("deleted_at", "is", null)
      .single()

    if (!doc) return NextResponse.json({ error: "Document not found in recycle bin" }, { status: 404 })

    await adminClient
      .from("documents")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", id)

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "restore_document",
      resource_type: "document",
      resource_id: id,
    })

    return NextResponse.json({ success: true })
})

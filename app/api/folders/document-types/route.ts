import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async () => {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from("document_types")
    .select("id, name")
    .order("name")

  return NextResponse.json({ documentTypes: data ?? [] })
})

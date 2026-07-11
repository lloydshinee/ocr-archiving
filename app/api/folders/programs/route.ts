import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async () => {
  const adminClient = createAdminClient()
  const { data: programs } = await adminClient
    .from("programs")
    .select("id, name")
    .order("name")

  return NextResponse.json({ programs: programs ?? [] })
})

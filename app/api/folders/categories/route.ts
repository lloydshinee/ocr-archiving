import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async () => {
  const adminClient = createAdminClient()
  const { data: categories } = await adminClient
    .from("categories")
    .select("id, name")
    .order("name")

  return NextResponse.json({ categories: categories ?? [] })
})

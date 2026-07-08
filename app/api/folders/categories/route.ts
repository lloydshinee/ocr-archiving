import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name")
      .order("name")

    return NextResponse.json({ categories: categories ?? [] })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

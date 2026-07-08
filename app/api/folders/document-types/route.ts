import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from("document_types")
      .select("id, name")
      .order("name")

    return NextResponse.json({ documentTypes: data ?? [] })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data: programs } = await adminClient
      .from("programs")
      .select("id, name")
      .order("name")

    return NextResponse.json({ programs: programs ?? [] })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

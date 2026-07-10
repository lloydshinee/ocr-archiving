import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data: programs } = await adminClient
      .from("programs")
      .select("id, name, description, created_at, updated_at")
      .order("name")

    return NextResponse.json({ programs: programs ?? [] })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "dean") {
      return NextResponse.json({ error: "Only the Dean can manage programs." }, { status: 403 })
    }

    const { name, description } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Program name is required." }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("programs")
      .insert({ name: name.trim(), description: description?.trim() || null })
      .select("id, name, description, created_at, updated_at")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A program with that name already exists." }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to create program." }, { status: 500 })
    }

    await adminClient.from("folders").insert({
      name: data.name,
      program_id: data.id,
      parent_id: null,
      owner_id: user.id,
      created_by: user.id,
      inherit_permissions: true,
    })

    return NextResponse.json({ program: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

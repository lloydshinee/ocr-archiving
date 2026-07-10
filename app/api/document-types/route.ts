import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from("document_types")
      .select("id, name, description, created_at, updated_at")
      .order("name")

    return NextResponse.json({ documentTypes: data ?? [] })
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
      return NextResponse.json({ error: "Only the Dean can manage document types." }, { status: 403 })
    }

    const { name, description } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Document type name is required." }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("document_types")
      .insert({ name: name.trim(), description: description?.trim() || null })
      .select("id, name, description, created_at, updated_at")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A document type with that name already exists." }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to create document type." }, { status: 500 })
    }

    return NextResponse.json({ documentType: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

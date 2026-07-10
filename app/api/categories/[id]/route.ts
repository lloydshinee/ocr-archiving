import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { createClient } from "@/lib/supabase/server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
      return NextResponse.json({ error: "Only the Dean can manage categories." }, { status: 403 })
    }

    const { id } = await params
    const { name, description } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("categories")
      .update({ name: name.trim(), description: description?.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, description, created_at, updated_at")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to update category." }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 })
    }

    return NextResponse.json({ category: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
      return NextResponse.json({ error: "Only the Dean can manage categories." }, { status: 403 })
    }

    const { id } = await params
    const adminClient = createAdminClient()

    const { count: docCount } = await adminClient
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id)

    const { count: folderCount } = await adminClient
      .from("folders")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id)

    if ((docCount ?? 0) > 0 || (folderCount ?? 0) > 0) {
      return NextResponse.json({
        error: "Cannot delete this category. It is assigned to documents or folders.",
      }, { status: 409 })
    }

    const { error } = await adminClient
      .from("categories")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: "Failed to delete category." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

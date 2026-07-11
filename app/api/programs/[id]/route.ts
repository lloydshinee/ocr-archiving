import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const adminClient = createAdminClient()
  const { id } = await params

  const { data } = await adminClient
    .from("programs")
    .select("id, name, description, created_at, updated_at")
    .eq("id", id)
    .single()

  if (!data) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 })
  }

  return NextResponse.json({ program: data })
})

export const PATCH = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user, profile } = await requireAuth()

  if (profile.role !== "dean") {
    return NextResponse.json({ error: "Only the Dean can manage programs." }, { status: 403 })
  }

  const { id } = await params
  const { name, description } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Program name is required." }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("programs")
    .update({ name: name.trim(), description: description?.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, description, created_at, updated_at")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A program with that name already exists." }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to update program." }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 })
  }

  return NextResponse.json({ program: data })
})

export const DELETE = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user, profile } = await requireAuth()

  if (profile.role !== "dean") {
    return NextResponse.json({ error: "Only the Dean can manage programs." }, { status: 403 })
  }

  const { id } = await params
  const adminClient = createAdminClient()

  const { count: userCount } = await adminClient
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("program_id", id)

  const { count: folderCount } = await adminClient
    .from("folders")
    .select("*", { count: "exact", head: true })
    .eq("program_id", id)

  if ((userCount ?? 0) > 0 || (folderCount ?? 0) > 0) {
    return NextResponse.json({
      error: "Cannot delete this program. It has users or folders assigned to it.",
    }, { status: 409 })
  }

  const { error } = await adminClient
    .from("programs")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: "Failed to delete program." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})

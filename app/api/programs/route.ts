import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async () => {
  const adminClient = createAdminClient()
  const { data: programs } = await adminClient
    .from("programs")
    .select("id, name, description, created_at, updated_at")
    .order("name")

  return NextResponse.json({ programs: programs ?? [] })
})

export const POST = withErrorHandling(async (request: Request) => {
  const { user, profile } = await requireAuth()

  if (profile.role !== "dean") {
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
})

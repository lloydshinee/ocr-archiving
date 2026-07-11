import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async () => {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from("document_types")
    .select("id, name, description, created_at, updated_at")
    .order("name")

  return NextResponse.json({ documentTypes: data ?? [] })
})

export const POST = withErrorHandling(async (request: Request) => {
  const { user, profile } = await requireAuth()

  if (profile.role !== "dean") {
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
})

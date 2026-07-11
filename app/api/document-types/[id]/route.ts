import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const PUT = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { profile } = await requireAuth()

  if (profile.role !== "dean") {
    return NextResponse.json({ error: "Only the Dean can manage document types." }, { status: 403 })
  }

  const { id } = await params
    const { name, description } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Document type name is required." }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("document_types")
      .update({ name: name.trim(), description: description?.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, description, created_at, updated_at")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A document type with that name already exists." }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to update document type." }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Document type not found." }, { status: 404 })
    }

    return NextResponse.json({ documentType: data })
})

export const DELETE = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { profile } = await requireAuth()

  if (profile.role !== "dean") {
    return NextResponse.json({ error: "Only the Dean can manage document types." }, { status: 403 })
  }

  const { id } = await params
    const adminClient = createAdminClient()

    const { count: docCount } = await adminClient
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("document_type_id", id)

    if ((docCount ?? 0) > 0) {
      return NextResponse.json({
        error: "Cannot delete this document type. It is assigned to documents.",
      }, { status: 409 })
    }

    const { error } = await adminClient
      .from("document_types")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: "Failed to delete document type." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
})

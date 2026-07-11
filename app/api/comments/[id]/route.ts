import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const DELETE = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user, profile } = await requireAuth()

  const { id } = await params
  const adminClient = createAdminClient()

  const { data: comment } = await adminClient
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .single()

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 })
  }

  const isOwner = comment.user_id === user.id
  const isDean = profile.role === "dean"

  if (!isOwner && !isDean) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { error } = await adminClient.from("comments").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})

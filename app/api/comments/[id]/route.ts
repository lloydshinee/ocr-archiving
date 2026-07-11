import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { getUserProfile } from "@/lib/permission-utils"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

    const profile = await getUserProfile(user.id)
    const isOwner = comment.user_id === user.id
    const isDean = profile?.role === "dean"

    if (!isOwner && !isDean) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { error } = await adminClient.from("comments").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

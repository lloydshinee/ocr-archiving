import { createAdminClient } from "@/lib/admin-client"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "dean") {
      return NextResponse.json(
        { error: "Only the Dean can deactivate or reactivate users." },
        { status: 403 },
      )
    }

    const { id } = await params

    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account." },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient()

    const { data: targetUser } = await adminClient
      .from("users")
      .select("is_deactivated")
      .eq("id", id)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

    if (targetUser.is_deactivated) {
      const { error } = await adminClient
        .from("users")
        .update({
          is_deactivated: false,
          deactivated_at: null,
        })
        .eq("id", id)

      if (error) {
        return NextResponse.json(
          { error: "Failed to reactivate user." },
          { status: 500 },
        )
      }

      return NextResponse.json({ success: true, reactivated: true })
    }

    const { error } = await adminClient
      .from("users")
      .update({
        is_deactivated: true,
        deactivated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: "Failed to deactivate user." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, deactivated: true })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

import { createAdminClient } from "@/lib/admin-client"
import { canCreateRole, type UserRole } from "@/lib/user-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(
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
        { error: "Only the Dean can edit users." },
        { status: 403 },
      )
    }

    const { id } = await params

    const body = await request.json()
    const { fullName, email, role, programId, password } = body

    if (!fullName || !email || !role) {
      return NextResponse.json(
        { error: "Full name, email, and role are required." },
        { status: 400 },
      )
    }

    if (!canCreateRole("dean", role as UserRole)) {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 },
      )
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient()

    if (password) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        id,
        { password },
      )

      if (authError) {
        return NextResponse.json(
          { error: authError.message },
          { status: 500 },
        )
      }
    }

    if (email) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        id,
        { email },
      )

      if (authError) {
        return NextResponse.json(
          { error: authError.message },
          { status: 500 },
        )
      }
    }

    let targetProgramId: string | null = programId ?? null
    if (role !== "program_head") {
      targetProgramId = null
    }

    const { error: updateError } = await adminClient
      .from("users")
      .update({
        email,
        full_name: fullName,
        role,
        program_id: targetProgramId,
      })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user profile." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

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

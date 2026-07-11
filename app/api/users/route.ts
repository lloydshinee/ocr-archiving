import { createAdminClient } from "@/lib/admin-client"
import { canCreateRole, type UserRole } from "@/lib/user-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
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
      .select("role, program_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { data: authUsers, error: authError } =
      await adminClient.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      )
    }

    let query = adminClient.from("users").select("*")

    if (profile.role === "program_head") {
      query = query.or(
        `program_id.eq.${profile.program_id},created_by.eq.${user.id}`,
      )
    }

    const { data: publicUsers, error: dbError } = await query.order(
      "created_at",
      { ascending: false },
    )

    if (dbError) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      )
    }

    const users = publicUsers.map((pu) => {
      const au = authUsers.users.find((u) => u.id === pu.id)
      return {
        id: pu.id,
        email: pu.email,
        full_name: pu.full_name,
        role: pu.role,
        program_id: pu.program_id,
        is_deactivated: pu.is_deactivated,
        deactivated_at: pu.deactivated_at,
        created_at: pu.created_at,
        created_by: pu.created_by,
        last_sign_in_at: au?.last_sign_in_at ?? null,
      }
    })

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
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
      .select("role, program_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 })
    }

    const { email, password, fullName, role, programId } =
      await request.json()

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Email, password, full name, and role are required." },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      )
    }

    if (!canCreateRole(profile.role as UserRole, role as UserRole)) {
      return NextResponse.json(
        { error: "You do not have permission to create this role." },
        { status: 403 },
      )
    }

    let targetProgramId: string | null = programId ?? null

    if (profile.role === "program_head") {
      if (role === "program_head" || role === "dean") {
        return NextResponse.json(
          { error: "Cannot create this role." },
          { status: 403 },
        )
      }
      targetProgramId = profile.program_id
    }

    const adminClient = createAdminClient()

    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create user." },
        { status: 500 },
      )
    }

    const { error: updateError } = await adminClient
      .from("users")
      .update({
        email,
        full_name: fullName,
        role,
        program_id: targetProgramId,
        created_by: user.id,
      })
      .eq("id", authUser.user.id)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user profile." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, userId: authUser.user.id }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

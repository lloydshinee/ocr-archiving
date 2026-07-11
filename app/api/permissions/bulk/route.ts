import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { canManagePermissions, ALL_ACTIONS, type PermAction } from "@/lib/permission-utils"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { folderId, role, actions } = await request.json()

    if (!folderId || !role || !actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { error: "folderId, role, and actions are required" },
        { status: 400 },
      )
    }

    const validRoles = ["dean", "program_head", "faculty", "student_assistant"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const canManage = await canManagePermissions(user.id, folderId)
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to manage permissions on this folder" },
        { status: 403 },
      )
    }

    const validActions = actions.filter((a: PermAction): a is PermAction =>
      ALL_ACTIONS.includes(a),
    )

    if (validActions.length === 0) {
      return NextResponse.json(
        { error: `Invalid actions. Valid: ${ALL_ACTIONS.join(", ")}` },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from("users")
      .select("role, program_id")
      .eq("id", user.id)
      .single()

    let userQuery = adminClient.from("users").select("id, email").eq("role", role)

    if (profile?.role === "program_head") {
      userQuery = userQuery.eq("program_id", profile.program_id ?? "")
    }

    const { data: targetUsers, error: usersError } = await userQuery

    if (usersError || !targetUsers || targetUsers.length === 0) {
      return NextResponse.json(
        { error: "No users found with this role" },
        { status: 404 },
      )
    }

    let granted = 0

    for (const targetUser of targetUsers) {
      if (targetUser.id === user.id) continue

      const { data: existing } = await adminClient
        .from("permissions")
        .select("id, actions")
        .eq("user_id", targetUser.id)
        .eq("folder_id", folderId)
        .single()

      if (existing) {
        const merged = [...new Set([...existing.actions, ...validActions])]
        await adminClient
          .from("permissions")
          .update({ actions: merged, assigned_by: user.id, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
      } else {
        await adminClient.from("permissions").insert({
          user_id: targetUser.id,
          folder_id: folderId,
          actions: validActions,
          assigned_by: user.id,
        })
      }

      await adminClient.from("notifications").insert({
        user_id: targetUser.id,
        type: "permission",
        title: "Permissions updated",
        body: `You were granted ${validActions.join(", ")} access on a folder`,
        resource_type: "folder",
        resource_id: folderId,
      })

      granted++
    }

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "bulk_grant_permission",
      resource_type: "folder",
      resource_id: folderId,
      details: { target_role: role, actions: validActions, user_count: granted },
    })

    return NextResponse.json({ granted })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

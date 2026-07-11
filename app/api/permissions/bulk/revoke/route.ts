import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { canManagePermissions } from "@/lib/permission-utils"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { folderId, role } = await request.json()

    if (!folderId || !role) {
      return NextResponse.json(
        { error: "folderId and role are required" },
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

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from("users")
      .select("role, program_id")
      .eq("id", user.id)
      .single()

    const { data: targetUsers } = await adminClient
      .from("users")
      .select("id")
      .eq("role", role)
      .then((result) => {
        if (profile?.role === "program_head") {
          return adminClient
            .from("users")
            .select("id")
            .eq("role", role)
            .eq("program_id", profile.program_id ?? "")
        }
        return result
      })

    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json(
        { error: "No users found with this role" },
        { status: 404 },
      )
    }

    const targetIds = targetUsers.map((u) => u.id).filter((id) => id !== user.id)

    if (targetIds.length === 0) {
      return NextResponse.json({ revoked: 0 })
    }

    const { data: permsToRevoke } = await adminClient
      .from("permissions")
      .select("id, user_id, actions")
      .eq("folder_id", folderId)
      .in("user_id", targetIds)

    if (!permsToRevoke || permsToRevoke.length === 0) {
      return NextResponse.json({ revoked: 0 })
    }

    const permIds = permsToRevoke.map((p) => p.id)

    await adminClient.from("permissions").delete().in("id", permIds)

    for (const perm of permsToRevoke) {
      await adminClient.from("notifications").insert({
        user_id: perm.user_id,
        type: "permission",
        title: "Permissions revoked",
        body: `Your permissions on a folder were revoked`,
        resource_type: "folder",
        resource_id: folderId,
      })
    }

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "bulk_revoke_permission",
      resource_type: "folder",
      resource_id: folderId,
      details: { target_role: role, user_count: permsToRevoke.length },
    })

    return NextResponse.json({ revoked: permsToRevoke.length })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

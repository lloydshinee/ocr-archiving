import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { canManagePermissions, getUserProfile, ALL_ACTIONS, type PermAction } from "@/lib/permission-utils"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const adminClient = createAdminClient()

    const { data: perm } = await adminClient
      .from("permissions")
      .select("id, folder_id, document_id, user_id, actions")
      .eq("id", id)
      .single()

    if (!perm) return NextResponse.json({ error: "Permission not found" }, { status: 404 })

    if (perm.folder_id) {
      const canManage = await canManagePermissions(user.id, perm.folder_id)
      if (!canManage) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

      const { data: folder } = await adminClient
        .from("folders")
        .select("owner_id")
        .eq("id", perm.folder_id)
        .single()

      if (folder && folder.owner_id === perm.user_id) {
        const profile = await getUserProfile(user.id)
        if (profile?.role !== "dean" && profile?.role !== "program_head") {
          return NextResponse.json(
            { error: "Cannot modify the folder owner's baseline permissions" },
            { status: 403 },
          )
        }
      }
    }

    const { actions, assign } = await request.json()

    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json({ error: "actions array is required" }, { status: 400 })
    }

    const validActions = actions.filter((a): a is PermAction =>
      ALL_ACTIONS.includes(a),
    )

    const current: string[] = perm.actions ?? []
    const updated = assign
      ? [...new Set([...current, ...validActions])]
      : current.filter((a) => !(validActions as string[]).includes(a))

    const { data: result } = await adminClient
      .from("permissions")
      .update({ actions: updated, assigned_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "modify_permission",
      resource_type: perm.folder_id ? "folder" : "document",
      resource_id: perm.folder_id ?? perm.document_id,
      details: { target_user_id: perm.user_id, previous: current, updated, assign },
    })

    await adminClient.from("notifications").insert({
      user_id: perm.user_id,
      type: "permission",
      title: "Permissions updated",
      body: `Your permissions on a ${perm.folder_id ? "folder" : "document"} were modified`,
      resource_type: perm.folder_id ? "folder" : "document",
      resource_id: perm.folder_id ?? perm.document_id,
    })

    return NextResponse.json({ permission: result })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const { data: perm } = await adminClient
      .from("permissions")
      .select("id, folder_id, document_id, user_id, actions")
      .eq("id", id)
      .single()

    if (!perm) return NextResponse.json({ error: "Permission not found" }, { status: 404 })

    if (perm.folder_id) {
      const canManage = await canManagePermissions(user.id, perm.folder_id)
      if (!canManage) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

      const { data: folder } = await adminClient
        .from("folders")
        .select("owner_id")
        .eq("id", perm.folder_id)
        .single()

      if (folder && folder.owner_id === perm.user_id) {
        const profile = await getUserProfile(user.id)
        if (profile?.role !== "dean" && profile?.role !== "program_head") {
          return NextResponse.json(
            { error: "Cannot revoke the folder owner's baseline permissions" },
            { status: 403 },
          )
        }
      }
    }

    await adminClient.from("permissions").delete().eq("id", id)

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "revoke_permission",
      resource_type: perm.folder_id ? "folder" : "document",
      resource_id: perm.folder_id ?? perm.document_id,
      details: { target_user_id: perm.user_id, revoked_actions: perm.actions },
    })

    await adminClient.from("notifications").insert({
      user_id: perm.user_id,
      type: "permission",
      title: "Permissions revoked",
      body: `Your permissions on a ${perm.folder_id ? "folder" : "document"} were revoked`,
      resource_type: perm.folder_id ? "folder" : "document",
      resource_id: perm.folder_id ?? perm.document_id,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

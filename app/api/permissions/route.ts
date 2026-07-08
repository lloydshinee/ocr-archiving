import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { canManagePermissions, ALL_ACTIONS, type PermAction } from "@/lib/permission-utils"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { userId, folderId, documentId, actions } = await request.json()

    if (!userId || (!folderId && !documentId) || !actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { error: "userId, folderId or documentId, and actions are required" },
        { status: 400 },
      )
    }

    const resourceId = folderId || documentId
    if (folderId) {
      const canManage = await canManagePermissions(user.id, folderId)
      if (!canManage) {
        return NextResponse.json(
          { error: "You don't have permission to manage permissions on this folder" },
          { status: 403 },
        )
      }
    }

    const validActions = actions.filter((a): a is PermAction =>
      ALL_ACTIONS.includes(a),
    )

    if (validActions.length === 0) {
      return NextResponse.json(
        { error: `Invalid actions. Valid: ${ALL_ACTIONS.join(", ")}` },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient()

    const { data: existing } = await adminClient
      .from("permissions")
      .select("id, actions")
      .eq("user_id", userId)
      .eq(folderId ? "folder_id" : "document_id", resourceId)
      .single()

    if (existing) {
      const merged = [...new Set([...existing.actions, ...validActions])]
      const { data: updated } = await adminClient
        .from("permissions")
        .update({ actions: merged, assigned_by: user.id, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()

      return NextResponse.json({ permission: updated })
    }

    const insertData: Record<string, unknown> = {
      user_id: userId,
      actions: validActions,
      assigned_by: user.id,
    }
    if (folderId) insertData.folder_id = folderId
    if (documentId) insertData.document_id = documentId

    const { data: created, error } = await adminClient
      .from("permissions")
      .insert(insertData as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "grant_permission",
      resource_type: folderId ? "folder" : "document",
      resource_id: resourceId,
      details: { target_user_id: userId, actions: validActions },
    })

    return NextResponse.json({ permission: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

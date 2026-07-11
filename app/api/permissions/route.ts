import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { canManagePermissions, isFolderLocked, canBypassLock, ALL_ACTIONS, type PermAction } from "@/lib/permission-utils"

export const POST = withErrorHandling(async (request: Request) => {
  const { user } = await requireAuth()

  const { userId, folderId, documentId, actions } = await request.json()

    if (!userId || (!folderId && !documentId) || !actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { error: "userId, folderId or documentId, and actions are required" },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient()
    const resourceId = folderId || documentId
    if (folderId) {
      const canManage = await canManagePermissions(adminClient, user.id, folderId)
      if (!canManage) {
        return NextResponse.json(
          { error: "You don't have permission to manage permissions on this folder" },
          { status: 403 },
        )
      }

      const locked = await isFolderLocked(adminClient, folderId)
      if (locked && !(await canBypassLock(adminClient, user.id))) {
        return NextResponse.json(
          { error: "Cannot modify permissions on a locked folder" },
          { status: 423 },
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

      const resourceName = folderId
        ? (await adminClient.from("folders").select("name").eq("id", folderId).single()).data?.name
        : (await adminClient.from("documents").select("title").eq("id", documentId!).single()).data?.title

      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        action: "grant_permission",
        resource_type: folderId ? "folder" : "document",
        resource_id: resourceId,
        details: { target_user_id: userId, actions: validActions, item: resourceName ?? "Unknown" },
      })

      await adminClient.from("notifications").insert({
        user_id: userId,
        type: "permission",
        title: "Permissions updated",
        body: `You were granted ${validActions.join(", ")} access on a ${folderId ? "folder" : "document"}`,
        resource_type: folderId ? "folder" : "document",
        resource_id: resourceId,
      })

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertData as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const resourceName = folderId
      ? (await adminClient.from("folders").select("name").eq("id", folderId).single()).data?.name
      : (await adminClient.from("documents").select("title").eq("id", documentId).single()).data?.title

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "grant_permission",
      resource_type: folderId ? "folder" : "document",
      resource_id: resourceId,
      details: { target_user_id: userId, actions: validActions, item: resourceName ?? "Unknown" },
    })

    await adminClient.from("notifications").insert({
      user_id: userId,
      type: "permission",
      title: "Permissions updated",
      body: `You were granted ${validActions.join(", ")} access on a ${folderId ? "folder" : "document"}`,
      resource_type: folderId ? "folder" : "document",
      resource_id: resourceId,
    })

    return NextResponse.json({ permission: created }, { status: 201 })
})

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

const VALID_ACTIONS = [
  "login", "upload", "download", "edit", "delete", "restore",
  "move", "folder_create", "permission_change", "ownership_transfer",
  "archive", "version_update", "delete_document", "restore_document",
  "permanent_delete", "grant_permission", "modify_permission",
  "revoke_permission", "archive_document", "unarchive_document",
  "archive_folder", "unarchive_folder", "restore_version",
]

export const GET = withErrorHandling(async (request: Request) => {
  const { user, profile } = await requireAuth()

  if (profile.role !== "dean" && profile.role !== "program_head") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

    const url = new URL(request.url)
    const urlUserId = url.searchParams.get("user_id")
    const action = url.searchParams.get("action")
    const resourceType = url.searchParams.get("resource_type")
    const dateFrom = url.searchParams.get("date_from")
    const dateTo = url.searchParams.get("date_to")
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)))
    const offset = (page - 1) * limit

    const adminClient = createAdminClient()
    let query = adminClient
      .from("audit_logs")
      .select("*, users!audit_logs_user_id_fkey(full_name, email, role)", { count: "exact" })

    if (profile.role === "program_head" && profile.program_id) {
      const { data: programFolders } = await adminClient
        .from("folders")
        .select("id")
        .eq("program_id", profile.program_id)
        .is("deleted_at", null)

      const { data: programDocs } = programFolders
        ? await adminClient
            .from("documents")
            .select("id")
            .in("folder_id", programFolders.map((f) => f.id))
        : { data: null }

      const resourceIds: string[] = [
        ...(programFolders?.map((f) => f.id) ?? []),
        ...(programDocs?.map((d) => d.id) ?? []),
      ]

      if (resourceIds.length > 0) {
        query = query.in("resource_id", resourceIds)
      } else {
        query = query.eq("resource_id", "__none__")
      }
    }

    if (urlUserId) {
      query = query.eq("user_id", urlUserId)
    }

    if (action && VALID_ACTIONS.includes(action)) {
      query = query.eq("action", action)
    }

    if (resourceType) {
      query = query.eq("resource_type", resourceType)
    }

    if (dateFrom) {
      query = query.gte("created_at", new Date(dateFrom).toISOString())
    }

    if (dateTo) {
      query = query.lte("created_at", new Date(dateTo).toISOString())
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entries, count, error } = (await (query as any)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)) as unknown as { data: Record<string, unknown>[] | null; count: number | null; error: unknown }

    if (error) {
      return NextResponse.json({ error: "Failed to fetch audit entries" }, { status: 500 })
    }

    const { data: users } = await adminClient
      .from("users")
      .select("id, full_name, email")

    return NextResponse.json({
      entries: (entries ?? []).map((e: Record<string, unknown>) => ({
        id: e.id,
        user_id: e.user_id,
        user_name: (e.users as Record<string, string> | null)?.full_name ?? "Unknown",
        user_email: (e.users as Record<string, string> | null)?.email ?? "",
        user_role: (e.users as Record<string, string> | null)?.role ?? "",
        action: e.action,
        resource_type: e.resource_type,
        resource_id: e.resource_id,
        details: e.details,
        created_at: e.created_at,
      })),
      total: count ?? 0,
      page,
      limit,
      valid_actions: VALID_ACTIONS,
      users: users ?? [],
    })
})

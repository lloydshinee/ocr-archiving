import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async (request: Request) => {
  const { user } = await requireAuth()

  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get("unread_only") === "true"
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100)

  const adminClient = createAdminClient()

  let query = adminClient
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq("is_read", false)
  }

  const { data: notifications, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { count: unreadCount } = await adminClient
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)

  return NextResponse.json({
    notifications: notifications ?? [],
    unread_count: unreadCount ?? 0,
  })
})

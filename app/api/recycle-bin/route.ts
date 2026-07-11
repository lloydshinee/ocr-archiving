import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"

export const GET = withErrorHandling(async () => {
  const { user } = await requireAuth()

  const adminClient = createAdminClient()

  const { data: folders } = await adminClient
    .from("folders")
    .select("id, name, parent_id, deleted_at, deleted_by, owner_id")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })

  const { data: documents } = await adminClient
    .from("documents")
    .select("id, title, folder_id, deleted_at, deleted_by, owner_id, file_name, file_size, file_type")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })

  const userIds = new Set<string>()
  for (const f of folders ?? []) {
    if (f.deleted_by) userIds.add(f.deleted_by)
    if (f.owner_id) userIds.add(f.owner_id)
  }
  for (const d of documents ?? []) {
    if (d.deleted_by) userIds.add(d.deleted_by)
    if (d.owner_id) userIds.add(d.owner_id)
  }

  const userMap = new Map<string, string>()
  if (userIds.size > 0) {
    const { data: users } = await adminClient
      .from("users")
      .select("id, full_name")
      .in("id", Array.from(userIds))
    for (const u of users ?? []) {
      userMap.set(u.id, u.full_name)
    }
  }

  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const isDean = profile?.role === "dean"

  const items = [
    ...(folders ?? []).map((f) => {
      const daysRemaining = 30 - Math.floor(
        (Date.now() - new Date(f.deleted_at).getTime()) / (1000 * 60 * 60 * 24),
      )
      return {
        id: f.id,
        name: f.name,
        type: "folder" as const,
        deletedAt: f.deleted_at,
        deletedBy: userMap.get(f.deleted_by ?? "") ?? "Unknown",
        deletedByYou: f.deleted_by === user.id,
        ownerId: f.owner_id ?? "",
        ownerName: userMap.get(f.owner_id ?? "") ?? "Unknown",
        daysRemaining,
        fileSize: null as number | null,
        fileType: null as string | null,
      }
    }),
    ...(documents ?? []).map((d) => {
      const daysRemaining = 30 - Math.floor(
        (Date.now() - new Date(d.deleted_at).getTime()) / (1000 * 60 * 60 * 24),
      )
      return {
        id: d.id,
        name: d.title,
        type: "document" as const,
        deletedAt: d.deleted_at,
        deletedBy: userMap.get(d.deleted_by ?? "") ?? "Unknown",
        deletedByYou: d.deleted_by === user.id,
        ownerId: d.owner_id ?? "",
        ownerName: userMap.get(d.owner_id ?? "") ?? "Unknown",
        daysRemaining,
        fileSize: d.file_size ?? null,
        fileType: d.file_type ?? null,
      }
    }),
  ].sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
  )

  return NextResponse.json({ items, isDean })
})

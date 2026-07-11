import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { getUserProfile } from "@/lib/permission-utils"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profile = await getUserProfile(user.id)
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

    const adminClient = createAdminClient()
    const isDean = profile.role === "dean"
    const isProgramHead = profile.role === "program_head"

    if (isDean) {
      const [
        { count: folderCount },
        { count: docCount },
        { count: archivedDocs },
        { count: permissionCount },
        { count: userCount },
      ] = await Promise.all([
        adminClient.from("folders").select("*", { count: "exact", head: true }).is("deleted_at", null),
        adminClient.from("documents").select("*", { count: "exact", head: true }).is("deleted_at", null),
        adminClient.from("documents").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("is_archived", true),
        adminClient.from("permissions").select("*", { count: "exact", head: true }),
        adminClient.from("users").select("*", { count: "exact", head: true }).eq("is_deactivated", false),
      ])

      const { data: storageData } = await adminClient
        .from("documents")
        .select("file_size")

      const totalStorage = (storageData ?? []).reduce((sum, d) => sum + (d.file_size ?? 0), 0)

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: recentUploads } = await adminClient
        .from("documents")
        .select("id, title, file_type, created_at, owner_id, users!documents_owner_id_fkey(full_name)")
        .is("deleted_at", null)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10)

      const { data: recentModified } = await adminClient
        .from("documents")
        .select("id, title, file_type, updated_at")
        .is("deleted_at", null)
        .gte("updated_at", sevenDaysAgo)
        .order("updated_at", { ascending: false })
        .limit(10)

      const { data: categoryData } = await adminClient
        .from("categories")
        .select("id, name")

      const categoryCounts: Record<string, number> = {}
      if (categoryData) {
        for (const cat of categoryData) {
          const { count } = await adminClient
            .from("documents")
            .select("*", { count: "exact", head: true })
            .is("deleted_at", null)
            .eq("category_id", cat.id)
          categoryCounts[cat.name] = count ?? 0
        }
      }

      const { data: usersByRole } = await adminClient
        .from("users")
        .select("role")
        .eq("is_deactivated", false)

      const roleCounts: Record<string, number> = { dean: 0, program_head: 0, faculty: 0, student_assistant: 0 }
      if (usersByRole) {
        for (const u of usersByRole) {
          roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1
        }
      }

      const { data: recentAudit } = await adminClient
        .from("audit_logs")
        .select("id, action, resource_type, created_at, user_id, users!audit_logs_user_id_fkey(full_name)")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20)

      const { data: allUsers } = await adminClient
        .from("users")
        .select("id, full_name, email, role, created_at")
        .eq("is_deactivated", false)

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      const inactiveUsers = (allUsers ?? []).filter((u) => {
        const created = new Date(u.created_at).getTime()
        return Date.now() - created > thirtyDaysMs
      }).slice(0, 10)

      return NextResponse.json({
        role: "dean",
        stats: {
          total_folders: folderCount ?? 0,
          total_documents: docCount ?? 0,
          total_storage_bytes: totalStorage,
          archived_documents: archivedDocs ?? 0,
          total_permissions: permissionCount ?? 0,
          active_users: userCount ?? 0,
        },
        recent_uploads: (recentUploads ?? []).map((d) => ({
          id: d.id,
          title: d.title,
          file_type: d.file_type,
          created_at: d.created_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          uploaded_by: (d.users as any)?.full_name ?? "Unknown",
        })),
        recent_modified: (recentModified ?? []).map((d) => ({
          id: d.id,
          title: d.title,
          updated_at: d.updated_at,
        })),
        document_categories: categoryCounts,
        users_by_role: roleCounts,
        recent_audit_entries: (recentAudit ?? []).map((a) => ({
          id: a.id,
          action: a.action,
          resource_type: a.resource_type,
          created_at: a.created_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user_name: (a.users as any)?.full_name ?? "Unknown",
        })),
        inactive_users: inactiveUsers.map((u) => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          role: u.role,
        })),
      })
    }

    const { data: accessibleFolders } = await adminClient
      .from("permissions")
      .select("folder_id")
      .eq("user_id", user.id)
      .contains("actions", ["view"])

    const accessibleFolderIds: string[] = (accessibleFolders ?? [])
      .map((p) => p.folder_id)
      .filter((id): id is string => id !== null)

    const { data: ownedFolders } = await adminClient
      .from("folders")
      .select("id")
      .eq("owner_id", user.id)
      .is("deleted_at", null)

    const allFolderIds = [...new Set([...accessibleFolderIds, ...(ownedFolders?.map((f) => f.id) ?? [])])]

    let recentDocsQuery = adminClient
      .from("documents")
      .select("id, title, file_type, created_at")
      .is("deleted_at", null)

    if (allFolderIds.length > 0) {
      recentDocsQuery = recentDocsQuery.in("folder_id", allFolderIds)
    } else if (!isProgramHead) {
      recentDocsQuery = recentDocsQuery.eq("owner_id", user.id)
    }

    if (isProgramHead && profile.program_id) {
      const { data: programFolders } = await adminClient
        .from("folders")
        .select("id")
        .eq("program_id", profile.program_id)
        .is("deleted_at", null)

      const phFolderIds = [...new Set([...allFolderIds, ...(programFolders?.map((f) => f.id) ?? [])])]
      recentDocsQuery = recentDocsQuery.in("folder_id", phFolderIds)
    }

    const { data: recentDocuments } = await recentDocsQuery
      .order("created_at", { ascending: false })
      .limit(10)

    return NextResponse.json({
      role: profile.role,
      recent_documents: recentDocuments ?? [],
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

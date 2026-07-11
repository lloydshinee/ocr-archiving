import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { walkFolderAncestry } from "@/lib/folder-utils"

type AdminClient = SupabaseClient<Database>

export type PermAction = "view" | "create" | "edit" | "move" | "delete" | "archive"
export const ALL_ACTIONS: PermAction[] = ["view", "create", "edit", "move", "delete", "archive"]

function getProfileFromClient(adminClient: AdminClient, userId: string) {
  return adminClient
    .from("users")
    .select("role, program_id, full_name")
    .eq("id", userId)
    .single()
    .then(({ data }) => data)
}

export async function getUserProfile(adminClient: AdminClient, userId: string) {
  return getProfileFromClient(adminClient, userId)
}

export async function hasFolderAction(
  adminClient: AdminClient,
  userId: string,
  folderId: string,
  action: PermAction,
): Promise<boolean> {
  const profile = await getProfileFromClient(adminClient, userId)
  if (!profile) return false

  if (profile.role === "dean") return true

  const { data: folder } = await adminClient
    .from("folders")
    .select("owner_id, program_id, inherit_permissions, parent_id")
    .eq("id", folderId)
    .single()

  if (!folder) return false

  if (folder.owner_id === userId) return true

  if (profile.role === "program_head") {
    if (folder.program_id === profile.program_id || folder.program_id === null) {
      return true
    }
  }

  const ancestors = await walkFolderAncestry(adminClient, folderId)
  for (const a of ancestors) {
    const { data: perm } = await adminClient
      .from("permissions")
      .select("actions")
      .eq("folder_id", a.id)
      .eq("user_id", userId)
      .single()

    if (perm?.actions?.includes(action)) return true
    if (!a.inherit_permissions) break
  }

  return false
}

export async function hasDocumentAction(
  adminClient: AdminClient,
  userId: string,
  documentId: string,
  action: PermAction,
): Promise<boolean> {
  const profile = await getProfileFromClient(adminClient, userId)
  if (!profile) return false

  if (profile.role === "dean") return true

  const { data: doc } = await adminClient
    .from("documents")
    .select("folder_id, owner_id, category_id")
    .eq("id", documentId)
    .single()

  if (!doc) return false

  if (doc.owner_id === userId) return true

  const { data: docPerm } = await adminClient
    .from("permissions")
    .select("actions")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .single()

  if (docPerm?.actions?.includes(action)) return true

  if (doc.folder_id) {
    return hasFolderAction(adminClient, userId, doc.folder_id, action)
  }

  return false
}

export async function resolvePermissionFolder(
  adminClient: AdminClient,
  folderId: string,
): Promise<string> {
  const ancestors = await walkFolderAncestry(adminClient, folderId)
  for (const a of ancestors) {
    if (!a.inherit_permissions) return a.id
  }
  return ancestors[ancestors.length - 1]?.id ?? folderId
}

export async function isFolderLocked(
  adminClient: AdminClient,
  folderId: string,
): Promise<boolean> {
  const ancestors = await walkFolderAncestry(adminClient, folderId)
  return ancestors.some((a) => a.is_locked)
}

export async function canViewFolder(
  adminClient: AdminClient,
  userId: string,
  folderId: string,
): Promise<boolean> {
  return hasFolderAction(adminClient, userId, folderId, "view")
}

export async function canManagePermissions(
  adminClient: AdminClient,
  userId: string,
  folderId: string,
): Promise<boolean> {
  const profile = await getProfileFromClient(adminClient, userId)
  if (!profile) return false
  if (profile.role === "dean") return true

  const { data: folder } = await adminClient
    .from("folders")
    .select("owner_id, program_id")
    .eq("id", folderId)
    .single()

  if (!folder) return false

  if (profile.role === "program_head" && folder.program_id === profile.program_id) {
    return true
  }

  if (folder.owner_id === userId) return true

  return false
}

export async function canLockFolder(
  adminClient: AdminClient,
  userId: string,
  folderId: string,
): Promise<boolean> {
  const profile = await getProfileFromClient(adminClient, userId)
  if (!profile) return false
  if (profile.role === "dean") return true

  const { data: folder } = await adminClient
    .from("folders")
    .select("program_id")
    .eq("id", folderId)
    .single()

  if (!folder) return false

  return profile.role === "program_head" && folder.program_id === profile.program_id
}

export async function canBypassLock(
  adminClient: AdminClient,
  userId: string,
): Promise<boolean> {
  const profile = await getProfileFromClient(adminClient, userId)
  if (!profile) return false
  return profile.role === "dean" || profile.role === "program_head"
}

type PermissionRow = {
  id: string
  user_id: string
  actions: string[]
  assigned_by: string
  created_at: string
  users: { full_name: string } | null
  assigned_by_user: { full_name: string } | null
  folder_id?: string
}

function formatPerm(p: PermissionRow) {
  return {
    id: p.id,
    userId: p.user_id,
    userFullName: p.users?.full_name ?? "Unknown",
    actions: p.actions,
    assignedBy: p.assigned_by,
    assignedByName: p.assigned_by_user?.full_name ?? "Unknown",
    assignedDate: p.created_at,
  }
}

export async function getFolderEffectivePermissions(
  adminClient: AdminClient,
  folderId: string,
): Promise<ReturnType<typeof formatPerm>[]> {
  const ancestors = await walkFolderAncestry(adminClient, folderId)
  const seen = new Set<string>()
  const result: ReturnType<typeof formatPerm>[] = []

  const cols = "id, user_id, actions, assigned_by, created_at, users!permissions_user_id_fkey(full_name), assigned_by_user:users!permissions_assigned_by_fkey(full_name)"

  for (const a of ancestors) {
    const { data } = await adminClient
      .from("permissions")
      .select(cols)
      .eq("folder_id", a.id)

    if (data) {
      for (const p of data) {
        const row = p as unknown as PermissionRow
        if (!seen.has(row.user_id)) {
          seen.add(row.user_id)
          result.push(formatPerm(row))
        }
      }
    }

    if (!a.inherit_permissions) break
  }

  return result
}

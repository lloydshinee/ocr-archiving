import { createAdminClient } from "@/lib/admin-client"

export type PermAction = "view" | "create" | "edit" | "move" | "delete" | "archive"
export const ALL_ACTIONS: PermAction[] = ["view", "create", "edit", "move", "delete", "archive"]

export async function getUserProfile(userId: string) {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from("users")
    .select("role, program_id, full_name")
    .eq("id", userId)
    .single()
  return data
}

export async function canViewFolder(userId: string, folderId: string): Promise<boolean> {
  return hasFolderAction(userId, folderId, "view")
}

export async function hasFolderAction(
  userId: string,
  folderId: string,
  action: PermAction,
): Promise<boolean> {
  const profile = await getUserProfile(userId)
  if (!profile) return false

  if (profile.role === "dean") return true

  const adminClient = createAdminClient()

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

  const resolvedFolderId = await resolvePermissionFolder(folderId)
  const { data: perm } = await adminClient
    .from("permissions")
    .select("actions")
    .eq("folder_id", resolvedFolderId)
    .eq("user_id", userId)
    .single()

  return perm?.actions?.includes(action) ?? false
}

export async function hasDocumentAction(
  userId: string,
  documentId: string,
  action: PermAction,
): Promise<boolean> {
  const profile = await getUserProfile(userId)
  if (!profile) return false

  if (profile.role === "dean") return true

  const adminClient = createAdminClient()

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
    return hasFolderAction(userId, doc.folder_id, action)
  }

  return false
}

export async function resolvePermissionFolder(
  folderId: string,
): Promise<string> {
  const adminClient = createAdminClient()

  let resolved = folderId
  let currentId: string | null = folderId

  while (currentId) {
    const { data: folder }: { data: { id: string; inherit_permissions: boolean; parent_id: string | null } | null } = await adminClient
      .from("folders")
      .select("id, inherit_permissions, parent_id")
      .eq("id", currentId)
      .single()

    if (!folder) return resolved

    resolved = folder.id

    if (!folder.inherit_permissions) {
      return folder.id
    }

    currentId = folder.parent_id ?? null
  }

  return resolved
}

export async function isFolderLocked(folderId: string): Promise<boolean> {
  const adminClient = createAdminClient()
  let currentId: string | null = folderId

  while (currentId) {
    const { data: folder }: { data: { id: string; is_locked: boolean; parent_id: string | null } | null } = await adminClient
      .from("folders")
      .select("id, is_locked, parent_id")
      .eq("id", currentId)
      .single()

    if (!folder) return false
    if (folder.is_locked) return true

    currentId = folder.parent_id ?? null
  }

  return false
}

export async function canManagePermissions(
  userId: string,
  folderId: string,
): Promise<boolean> {
  const profile = await getUserProfile(userId)
  if (!profile) return false
  if (profile.role === "dean") return true

  const adminClient = createAdminClient()

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
  userId: string,
  folderId: string,
): Promise<boolean> {
  const profile = await getUserProfile(userId)
  if (!profile) return false
  if (profile.role === "dean") return true

  const adminClient = createAdminClient()

  const { data: folder } = await adminClient
    .from("folders")
    .select("program_id")
    .eq("id", folderId)
    .single()

  if (!folder) return false

  return profile.role === "program_head" && folder.program_id === profile.program_id
}

export async function canBypassLock(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  if (!profile) return false
  return profile.role === "dean" || profile.role === "program_head"
}

export async function getFolderEffectivePermissions(
  folderId: string,
): Promise<{ userId: string; userFullName: string; actions: string[]; assignedBy: string; assignedByName: string; assignedDate: string }[]> {
  const adminClient = createAdminClient()

  const resolvedId = await resolvePermissionFolder(folderId)

  const { data } = await adminClient
    .from("permissions")
    .select("id, user_id, actions, assigned_by, created_at, users!permissions_user_id_fkey(full_name), assigned_by_user:users!permissions_assigned_by_fkey(full_name)")
    .eq("folder_id", resolvedId)

  if (!data) return []

  return data.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    userId: p.user_id as string,
    userFullName: (p.users as Record<string, unknown> | undefined)?.full_name as string ?? "Unknown",
    actions: p.actions as string[],
    assignedBy: p.assigned_by as string,
    assignedByName: (p.assigned_by_user as Record<string, unknown> | undefined)?.full_name as string ?? "Unknown",
    assignedDate: p.created_at as string,
  }))
}

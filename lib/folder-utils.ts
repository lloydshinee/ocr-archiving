import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./supabase/database.types"

type AdminClient = SupabaseClient<Database>

type FolderRow = Database["public"]["Tables"]["folders"]["Row"]

export type FolderTreeNode = FolderRow & {
  children: FolderTreeNode[]
}

export type AncestorFolder = {
  id: string
  parent_id: string | null
  name: string
  inherit_permissions: boolean
  is_locked: boolean
  deleted_at: string | null
}

export async function collectDescendantIds(
  adminClient: AdminClient,
  folderId: string,
  options?: { excludeDeleted?: boolean },
): Promise<string[]> {
  const result: string[] = [folderId]
  const query = adminClient
    .from("folders" as any)
    .select("id")
    .eq("parent_id", folderId)

  const { data: children } = await (options?.excludeDeleted
    ? (query as any).is("deleted_at", null)
    : query)

  if (children) {
    for (const child of children) {
      result.push(...(await collectDescendantIds(adminClient, child.id, options)))
    }
  }

  return result
}

export async function walkFolderAncestry(
  adminClient: AdminClient,
  folderId: string,
): Promise<AncestorFolder[]> {
  const ancestors: AncestorFolder[] = []
  let currentId: string | null = folderId

  while (currentId) {
    const { data: folder }: { data: AncestorFolder | null } = await adminClient
      .from("folders")
      .select("id, parent_id, name, inherit_permissions, is_locked, deleted_at")
      .eq("id", currentId)
      .single()

    if (!folder) break

    ancestors.push(folder)
    currentId = folder.parent_id
  }

  return ancestors
}

export function buildFolderTree(folders: FolderRow[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>()
  const roots: FolderTreeNode[] = []

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] })
  }

  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export type BreadcrumbItem = {
  id: string
  name: string
}

export async function getFolderBreadcrumbsFromDb(
  adminClient: AdminClient,
  folderId: string,
): Promise<BreadcrumbItem[]> {
  const ancestors = await walkFolderAncestry(adminClient, folderId)
  const breadcrumbs: BreadcrumbItem[] = []
  for (const a of ancestors) {
    if (a.deleted_at) continue
    breadcrumbs.unshift({ id: a.id, name: a.name })
  }
  return breadcrumbs
}

export function getFolderBreadcrumbs(
  folderId: string,
  flatFolders: FolderRow[],
): BreadcrumbItem[] {
  const folderMap = new Map(flatFolders.map((f) => [f.id, f]))
  const breadcrumbs: BreadcrumbItem[] = []
  let currentId: string | null = folderId

  while (currentId) {
    const folder = folderMap.get(currentId)
    if (!folder) break
    breadcrumbs.unshift({ id: folder.id, name: folder.name })
    currentId = folder.parent_id
  }

  return breadcrumbs
}

export function getFolderParentPath(
  folderId: string,
  flatFolders: FolderRow[],
): string {
  const breadcrumbs = getFolderBreadcrumbs(folderId, flatFolders)
  breadcrumbs.pop()
  return breadcrumbs.map((b) => b.name).join(" > ")
}

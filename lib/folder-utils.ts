import type { Database } from "./supabase/database.types"

type FolderRow = Database["public"]["Tables"]["folders"]["Row"]

export type FolderTreeNode = FolderRow & {
  children: FolderTreeNode[]
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

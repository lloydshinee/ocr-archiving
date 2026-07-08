"use client"

import { FolderIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import type { FolderTreeNode } from "@/lib/folder-utils"

function FolderTreeItem({ folder }: { folder: FolderTreeNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const href = `/dashboard/folders/${folder.id}`
  const isActive = pathname === href
  const hasChildren = folder.children.length > 0

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={isActive} onClick={() => router.push(href)}>
        <FolderIcon className="size-4 shrink-0" />
        <span className="truncate">{folder.name}</span>
      </SidebarMenuButton>
      {hasChildren && (
        <SidebarMenuSub>
          {folder.children.map((child) => (
            <FolderTreeItemRecursive key={child.id} folder={child} />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

function FolderTreeItemRecursive({ folder }: { folder: FolderTreeNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const href = `/dashboard/folders/${folder.id}`
  const isActive = pathname === href
  const hasChildren = folder.children.length > 0

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={isActive}
        onClick={() => router.push(href)}
      >
        <span className="truncate">{folder.name}</span>
      </SidebarMenuSubButton>
      {hasChildren && (
        <SidebarMenuSub>
          {folder.children.map((child) => (
            <FolderTreeItemRecursive key={child.id} folder={child} />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuSubItem>
  )
}

export function FolderTree({ roots }: { roots: FolderTreeNode[] }) {
  if (roots.length === 0) {
    return (
      <div className="px-3 py-2">
        <p
          className="text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/40"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          No folders yet
        </p>
      </div>
    )
  }

  return (
    <SidebarMenu>
      {roots.map((folder) => (
        <FolderTreeItem key={folder.id} folder={folder} />
      ))}
    </SidebarMenu>
  )
}

"use client"

import { useState } from "react"
import { FolderIcon, FileTextIcon, ChevronRightIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import type { FolderTreeNode } from "@/lib/folder-utils"

function FolderTreeItem({
  folder,
  depth = 0,
}: {
  folder: FolderTreeNode
  depth?: number
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const href = `/dashboard/folders/${folder.id}`
  const isActive = pathname === href
  const hasChildren = folder.children.length > 0
  const isSub = depth > 0

  const Wrapper = isSub ? SidebarMenuSubItem : SidebarMenuItem

  if (!hasChildren) {
    return (
      <Wrapper>
        {isSub ? (
          <SidebarMenuSubButton
            isActive={isActive}
            onClick={() => router.push(href)}
          >
            <span className="truncate">{folder.name}</span>
          </SidebarMenuSubButton>
        ) : (
          <SidebarMenuButton isActive={isActive} onClick={() => router.push(href)}>
            <FolderIcon className="size-4 shrink-0" />
            <span className="truncate">{folder.name}</span>
          </SidebarMenuButton>
        )}
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <Collapsible open={open} onOpenChange={setOpen}>
        {isSub ? (
          <div className="flex items-center gap-0 pr-0.5">
            <SidebarMenuSubButton
              isActive={isActive}
              onClick={() => router.push(href)}
              className="flex-1"
            >
              <span className="truncate">{folder.name}</span>
            </SidebarMenuSubButton>
            <CollapsibleTrigger
              render={
                <SidebarMenuAction>
                  <ChevronRightIcon
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-200",
                      open && "rotate-90",
                    )}
                  />
                </SidebarMenuAction>
              }
            />
          </div>
        ) : (
          <>
            <SidebarMenuButton isActive={isActive} onClick={() => router.push(href)}>
              <FolderIcon className="size-4 shrink-0" />
              <span className="truncate">{folder.name}</span>
            </SidebarMenuButton>
            <CollapsibleTrigger
              render={
                <SidebarMenuAction>
                  <ChevronRightIcon
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-200",
                      open && "rotate-90",
                    )}
                  />
                </SidebarMenuAction>
              }
            />
          </>
        )}
        <CollapsibleContent>
          <SidebarMenuSub>
            {folder.children.map((child) => (
              <FolderTreeItem key={child.id} folder={child} depth={depth + 1} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </Wrapper>
  )
}

export function FolderTree({ roots }: { roots: FolderTreeNode[] }) {
  if (roots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-3 py-4">
        <FileTextIcon className="size-5 text-sidebar-foreground/25" />
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

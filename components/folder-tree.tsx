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
  const isArchived = folder.is_archived

  if (!hasChildren) {
    return (
      <Wrapper>
        {isSub ? (
          <SidebarMenuSubButton
            isActive={isActive}
            onClick={() => router.push(href)}
            className={cn(isArchived && "opacity-50")}
          >
            <span className={cn("truncate", isArchived && "italic")}>{folder.name}</span>
            {isArchived && (
              <span
                className="ml-1 shrink-0 text-[9px] text-muted-foreground/50"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                ARCHIVED
              </span>
            )}
          </SidebarMenuSubButton>
        ) : (
          <SidebarMenuButton
            isActive={isActive}
            tooltip={folder.name + (isArchived ? " (archived)" : "")}
            onClick={() => router.push(href)}
            className={cn(isArchived && "opacity-60")}
          >
            <FolderIcon className="size-4 shrink-0" />
            <span className={cn("truncate group-data-[collapsible=icon]:hidden", isArchived && "italic")}>
              {folder.name}
            </span>
            {isArchived && (
              <span
                className="ml-1 shrink-0 text-[9px] text-muted-foreground/50 group-data-[collapsible=icon]:hidden"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                ARCHIVED
              </span>
            )}
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
              className={cn("flex-1", isArchived && "opacity-50")}
            >
              <span className={cn("truncate", isArchived && "italic")}>{folder.name}</span>
              {isArchived && (
                <span
                  className="ml-1 shrink-0 text-[9px] text-muted-foreground/50"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  ARCHIVED
                </span>
              )}
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
            <SidebarMenuButton
              isActive={isActive}
              tooltip={folder.name + (isArchived ? " (archived)" : "")}
              onClick={() => router.push(href)}
              className={cn(isArchived && "opacity-60")}
            >
              <FolderIcon className="size-4 shrink-0" />
              <span className={cn("truncate group-data-[collapsible=icon]:hidden", isArchived && "italic")}>
                {folder.name}
              </span>
              {isArchived && (
                <span
                  className="ml-1 shrink-0 text-[9px] text-muted-foreground/50 group-data-[collapsible=icon]:hidden"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  ARCHIVED
                </span>
              )}
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
          className="text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden"
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

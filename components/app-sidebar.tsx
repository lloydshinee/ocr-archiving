"use client"

import { useEffect, useState, createContext, useContext, useCallback } from "react"
import { FolderIcon, FileTextIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import { FolderTree } from "@/components/folder-tree"
import { buildFolderTree, type FolderTreeNode } from "@/lib/folder-utils"
import type { Database } from "@/lib/supabase/database.types"
import { useRouter } from "next/navigation"

type FolderRow = Database["public"]["Tables"]["folders"]["Row"]
type ProgramRow = Database["public"]["Tables"]["programs"]["Row"]

const FolderContext = createContext<{
  folders: FolderRow[]
  programs: ProgramRow[]
  loading: boolean
  refresh: () => void
}>({
  folders: [],
  programs: [],
  loading: true,
  refresh: () => {},
})

export function useFolderContext() {
  return useContext(FolderContext)
}

export function AppSidebar() {
  const router = useRouter()
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [foldersRes, programsRes] = await Promise.all([
        fetch("/api/folders"),
        fetch("/api/folders/programs"),
      ])

      if (!foldersRes.ok) throw new Error("Failed to load folders")
      if (!programsRes.ok) throw new Error("Failed to load programs")

      const foldersData = await foldersRes.json()
      const programsData = await programsRes.json()

      setFolders(foldersData.folders ?? [])
      setPrograms(programsData.programs ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  const programMap = new Map(programs.map((p) => [p.id, p.name]))

  const collegeWideRoots = buildFolderTree(
    folders.filter((f) => f.parent_id === null && f.program_id === null),
  )

  const programRoots = new Map<string, FolderRow[]>()
  for (const f of folders) {
    if (f.parent_id === null && f.program_id) {
      const existing = programRoots.get(f.program_id) ?? []
      existing.push(f)
      programRoots.set(f.program_id, existing)
    }
  }

  const programTrees: { programId: string; programName: string; tree: FolderTreeNode[] }[] = []

  for (const [programId, roots] of programRoots) {
    const programFolders = new Set<string>()

    function collectDescendants(parentId: string) {
      programFolders.add(parentId)
      for (const f of folders) {
        if (f.parent_id === parentId) {
          collectDescendants(f.id)
        }
      }
    }

    for (const root of roots) {
      collectDescendants(root.id)
    }

    const subtreeFolders = folders.filter((f) => programFolders.has(f.id))
    const tree = buildFolderTree(subtreeFolders)
    programTrees.push({
      programId,
      programName: programMap.get(programId) ?? "Unknown Program",
      tree,
    })
  }

  return (
    <FolderContext.Provider value={{ folders, programs, loading, refresh: fetchFolders }}>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border"
        style={{ backgroundColor: "var(--brand-ink)" }}
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" onClick={() => router.push("/dashboard")}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <FolderIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">CCS Archive</span>
                  <span
                    className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/40"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Records
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {loading ? (
            <div className="flex flex-col gap-2 px-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SidebarMenuSkeleton key={i} showIcon />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 px-3 py-6">
              <p className="text-xs text-sidebar-foreground/60">{error}</p>
              <button
                onClick={fetchFolders}
                className="text-xs text-sidebar-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-3 py-8">
              <FileTextIcon className="size-6 text-sidebar-foreground/30" />
              <p
                className="text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/40 text-center"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                No folders to show
              </p>
            </div>
          ) : (
            <>
              {collegeWideRoots.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>College-Wide</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <FolderTree roots={collegeWideRoots} />
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {programTrees.map(({ programId, programName, tree }) =>
                tree.length > 0 ? (
                  <SidebarGroup key={programId}>
                    <SidebarGroupLabel>{programName}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <FolderTree roots={tree} />
                    </SidebarGroupContent>
                  </SidebarGroup>
                ) : null,
              )}
            </>
          )}
        </SidebarContent>

        <SidebarFooter>
          <div
            className="px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/25"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            CCS Archive v1.0
          </div>
        </SidebarFooter>
      </Sidebar>
    </FolderContext.Provider>
  )
}

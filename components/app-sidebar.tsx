"use client"

import { useEffect, useState } from "react"
import { FolderIcon, FileTextIcon, PlusIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { FolderTree } from "@/components/folder-tree"
import { buildFolderTree, type FolderTreeNode } from "@/lib/folder-utils"
import type { Database } from "@/lib/supabase/database.types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type FolderRow = Database["public"]["Tables"]["folders"]["Row"]
type ProgramRow = Database["public"]["Tables"]["programs"]["Row"]

export function AppSidebar({ userRole }: { userRole?: string | null }) {
  const router = useRouter()
  const { setOpenMobile } = useSidebar()
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderError, setNewFolderError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  async function refetchFolders() {
    try {
      setLoading(true)
      setError(null)

      const [foldersRes, programsRes] = await Promise.all([
        fetch(`/api/folders${showArchived ? "?showArchived=true" : ""}`),
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
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetchFolders()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  useEffect(() => {
    const handler = () => refetchFolders()
    window.addEventListener("refresh-sidebar", handler)
    return () => window.removeEventListener("refresh-sidebar", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  const programMap = new Map(programs.map((p) => [p.id, p.name]))

  const collegeWideIds = new Set<string>()

  function collectCollegeWideDescendants(parentId: string) {
    for (const f of folders) {
      if (f.parent_id === parentId && f.program_id === null) {
        collegeWideIds.add(f.id)
        collectCollegeWideDescendants(f.id)
      }
    }
  }

  for (const f of folders) {
    if (f.parent_id === null && f.program_id === null) {
      collegeWideIds.add(f.id)
      collectCollegeWideDescendants(f.id)
    }
  }

  const collegeWideRoots = buildFolderTree(
    folders.filter((f) => collegeWideIds.has(f.id)),
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

  const coveredIds = new Set<string>()
  function collectIds(nodes: FolderTreeNode[]) {
    for (const n of nodes) {
      coveredIds.add(n.id)
      collectIds(n.children)
    }
  }
  collectIds(collegeWideRoots)
  for (const { tree } of programTrees) {
    collectIds(tree)
  }

  const orphanedFolders = folders.filter((f) => !coveredIds.has(f.id))
  const permittedTree = buildFolderTree(orphanedFolders)

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewFolderError(null)

    if (!newFolderName.trim()) {
      setNewFolderError("Folder name is required")
      return
    }

    setCreatingFolder(true)

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setNewFolderError(data.error ?? "Failed to create folder")
        return
      }

      toast.success("Folder created")
      setDialogOpen(false)
      setNewFolderName("")
      refetchFolders()
    } catch {
      setNewFolderError("Something went wrong")
    } finally {
      setCreatingFolder(false)
    }
  }

  const canCreateTopLevel = userRole === "dean" || userRole === "program_head"

  return (
    <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border"
        style={{ backgroundColor: "var(--brand-ink)" }}
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip="CCS Archive"
                onClick={() => { router.push("/dashboard"); setOpenMobile(false) }}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <FolderIcon className="size-4" />
                </div>
                <div className="flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden flex">
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
          <div className="flex items-center justify-between px-3 py-2 group-data-[collapsible=icon]:hidden">
            <Label
              htmlFor="show-archived-toggle"
              className="cursor-pointer text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/50"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Show archived
            </Label>
            <Switch
              id="show-archived-toggle"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
          </div>

          {loading ? (
            <div className="flex flex-col gap-2 px-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SidebarMenuSkeleton key={i} showIcon />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 px-3 py-6 group-data-[collapsible=icon]:hidden">
              <p className="text-xs text-sidebar-foreground/60">{error}</p>
              <button
                onClick={refetchFolders}
                className="text-xs text-sidebar-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : folders.length === 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel>College-Wide</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="flex flex-col items-center gap-3 px-3 py-8">
                  <FileTextIcon className="size-6 text-sidebar-foreground/30" />
                  <p
                    className="text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/40 text-center group-data-[collapsible=icon]:hidden"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    No folders to show
                  </p>
                  {canCreateTopLevel && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger
                      render={
                        <button className="rounded-md border border-sidebar-border px-3 py-1 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors">
                          New folder
                        </button>
                      }
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New college-wide folder</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateFolder}>
                        <fieldset disabled={creatingFolder} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <Label
                              htmlFor="folder-name-empty"
                              className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                              style={{ fontFamily: "var(--font-mono)" }}
                            >
                              Folder name
                            </Label>
                            <Input
                              id="folder-name-empty"
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              placeholder="e.g. Handbooks"
                              autoFocus
                            />
                          </div>
                          {newFolderError && (
                            <p className="text-sm text-destructive" role="alert">
                              {newFolderError}
                            </p>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setDialogOpen(false)
                                setNewFolderName("")
                                setNewFolderError(null)
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={creatingFolder}>
                              {creatingFolder ? "Creating..." : "Create"}
                            </Button>
                          </div>
                        </fieldset>
                      </form>
                    </DialogContent>
                  </Dialog>}
                  </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <>
              {collegeWideRoots.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>College-Wide</SidebarGroupLabel>
                  {canCreateTopLevel && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger
                      render={
                        <SidebarGroupAction title="New college-wide folder">
                          <PlusIcon className="size-3" />
                        </SidebarGroupAction>
                      }
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New college-wide folder</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateFolder}>
                        <fieldset disabled={creatingFolder} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <Label
                              htmlFor="folder-name"
                              className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                              style={{ fontFamily: "var(--font-mono)" }}
                            >
                              Folder name
                            </Label>
                            <Input
                              id="folder-name"
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              placeholder="e.g. Handbooks"
                              autoFocus
                            />
                          </div>
                          {newFolderError && (
                            <p className="text-sm text-destructive" role="alert">
                              {newFolderError}
                            </p>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setDialogOpen(false)
                                setNewFolderName("")
                                setNewFolderError(null)
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={creatingFolder}>
                              {creatingFolder ? "Creating..." : "Create"}
                            </Button>
                          </div>
                        </fieldset>
                      </form>
                    </DialogContent>
                  </Dialog>}
                  <SidebarGroupContent>
                    <FolderTree roots={collegeWideRoots} />
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {programTrees.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>Programs</SidebarGroupLabel>
                  <SidebarGroupContent>
                    {programTrees.map(({ programId, tree }) =>
                      tree.length > 0 ? (
                        <div key={programId}>
                          <FolderTree roots={tree} />
                        </div>
                      ) : null,
                    )}
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {permittedTree.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel>Permitted</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <FolderTree roots={permittedTree} />
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </>
          )}
        </SidebarContent>

        <SidebarFooter>
          <div
            className="px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/25 group-data-[collapsible=icon]:hidden"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            CCS Archive v1.0
          </div>
        </SidebarFooter>
      </Sidebar>
  )
}

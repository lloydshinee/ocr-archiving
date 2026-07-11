"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MoveIcon, FolderRootIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { FolderCombobox } from "@/components/folder-combobox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const ROOT = "__root__"

interface MoveDialogProps {
  type: "folder" | "document"
  itemId: string
  currentParentId: string | null
  itemName: string
  trigger?: React.ReactElement
  disabled?: boolean
  canMoveToRoot?: boolean
  nativeButton?: boolean
}

export function MoveDialog({
  type, itemId, currentParentId, itemName, trigger, disabled, canMoveToRoot, nativeButton,
}: MoveDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const [folders, setFolders] = useState<{ id: string; name: string; parent_id: string | null }[]>([])
  const [targetId, setTargetId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const fetching = open && folders.length === 0 && !error

  useEffect(() => {
    if (!fetching) return
    fetch("/api/folders")
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((d) => setFolders(d.folders ?? []))
      .catch(() => setError("Failed to load folders"))
  }, [fetching])

  const folderOptions = useMemo(() => {
    const map = new Map(folders.map((f) => [f.id, f]))
    const path = (pid: string | null): string => {
      const parts: string[] = []
      let id: string | null = pid
      while (id) { const f = map.get(id); if (!f) break; parts.unshift(f.name); id = f.parent_id }
      return parts.join(" > ")
    }
    return folders.map((f) => ({ id: f.id, name: f.name, parentPath: path(f.parent_id) }))
  }, [folders])

  const excludeIds = useMemo(() => {
    const ids = new Set<string>()
    if (currentParentId && currentParentId !== ROOT) ids.add(currentParentId)
    if (type !== "folder") return Array.from(ids)
    ids.add(itemId)
    const walk = (pid: string) => { for (const f of folders) if (f.parent_id === pid) { ids.add(f.id); walk(f.id) } }
    walk(itemId)
    return Array.from(ids)
  }, [type, itemId, currentParentId, folders])

  const isRoot = targetId === ROOT

  const handleMove = async () => {
    if (!targetId) { setError("Please select a destination"); return }
    setMoving(true); setError(null)
    try {
      const body = type === "folder" ? { parentId: isRoot ? null : targetId } : { folderId: targetId }
      const res = await fetch(`/api/${type === "folder" ? "folders" : "documents"}/${itemId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to move") }
      toast.success(`"${itemName}" moved`)
      window.dispatchEvent(new CustomEvent("refresh-sidebar"))
      setOpen(false); setTargetId(""); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally { setMoving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} nativeButton={nativeButton} /> : (
        <DialogTrigger render={<Button variant="outline" size="sm" disabled={disabled} className="gap-1.5"><MoveIcon className="size-3.5" />Move</Button>} />
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>Move &ldquo;{itemName}&rdquo;</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Choose a destination for this {type === "folder" ? "folder" : "document"}.</p>

          {fetching ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading folders...</p>
          ) : error && folders.length === 0 ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {canMoveToRoot && type === "folder" && (
                <button type="button" onClick={() => setTargetId(ROOT)}
                  className={cn("flex items-center gap-3 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors", isRoot && "bg-accent/50")}>
                  <FolderRootIcon className="size-3.5 text-muted-foreground" />
                  <div><span className="font-medium">Top level</span><p className="text-[10px] text-muted-foreground/60">Make this a top-level folder</p></div>
                </button>
              )}
              {!isRoot ? (
                <FolderCombobox folders={folderOptions} value={targetId} onChange={setTargetId} placeholder="Select destination folder..." excludeIds={excludeIds} />
              ) : (
                <button type="button" onClick={() => setTargetId("")} className="text-xs text-muted-foreground/60 hover:text-foreground underline underline-offset-2 mt-1">Choose a specific folder instead</button>
              )}
            </div>
          )}

          {error && folders.length > 0 && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setTargetId(""); setError(null) }}>Cancel</Button>
            <Button onClick={handleMove} disabled={moving || !targetId}>{moving ? "Moving..." : "Move"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

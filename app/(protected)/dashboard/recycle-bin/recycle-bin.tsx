"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { SearchIcon, Trash2Icon, RotateCcwIcon, FolderIcon, AlertTriangleIcon } from "lucide-react"
import { fileTypeIcon } from "@/lib/file-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface BinItem {
  id: string
  name: string
  type: "folder" | "document"
  deletedAt: string
  deletedBy: string
  deletedByYou: boolean
  ownerId: string
  ownerName: string
  daysRemaining: number
  fileSize: number | null
  fileType: string | null
}

export function RecycleBin({ isDean }: { isDean: boolean }) {
  const [items, setItems] = useState<BinItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [restoring, setRestoring] = useState<Set<string>>(new Set())
  const [purging, setPurging] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.deletedBy.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q),
    )
  }, [items, search])

  async function reloadItems() {
    try {
      setLoading(true)
      const res = await fetch("/api/recycle-bin")
      if (!res.ok) throw new Error("Failed to load recycle bin")
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      toast.error("Failed to load recycle bin")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadItems()
  }, [])

  const handleRestore = async (item: BinItem) => {
    setRestoring((prev) => new Set(prev).add(item.id))
    try {
      const endpoint = item.type === "folder"
        ? `/api/folders/${item.id}/restore`
        : `/api/documents/${item.id}/restore`

      const res = await fetch(endpoint, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to restore")
        return
      }
      toast.success(`${item.type === "folder" ? "Folder" : "Document"} restored`)
      reloadItems()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setRestoring((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handlePurge = async (item: BinItem) => {
    setPurging((prev) => new Set(prev).add(item.id))
    try {
      const endpoint = item.type === "folder"
        ? `/api/folders/${item.id}?permanent=true`
        : `/api/documents/${item.id}?permanent=true`

      const res = await fetch(endpoint, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to purge")
        return
      }
      toast.success("Item permanently deleted")
      reloadItems()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setPurging((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 rounded-xl border bg-card shadow-sm">
        <Trash2Icon className="size-10 text-muted-foreground/25" />
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Recycle Bin is empty
        </p>
        <p className="text-sm text-muted-foreground/50">
          Deleted items will appear here for 30 days before permanent deletion
        </p>
      </div>
    )
  }

  const showEmptySearch = search.trim() && filtered.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, type, or who deleted it..."
          className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {showEmptySearch ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-card shadow-sm">
          <SearchIcon className="size-8 text-muted-foreground/25" />
          <p
            className="text-xs text-muted-foreground/60"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            No results match your search
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="divide-y">
        {filtered.map((item) => {
          const isExpired = item.daysRemaining <= 0

          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {item.type === "folder" ? (
                  <FolderIcon className="size-4 shrink-0 text-primary" />
                ) : (
                  fileTypeIcon(item.fileType ?? "")
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">{item.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {item.type}
                    </Badge>
                    {item.fileSize != null && (
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                        {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                    {item.deletedByYou && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        yours
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground/50">
                    <span>
                      Deleted by {item.deletedBy}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {new Date(item.deletedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      {isExpired ? (
                        <>
                          <AlertTriangleIcon className="size-3 text-red-400" />
                          <span className="text-red-400 font-medium">Expired</span>
                        </>
                      ) : (
                        <span>
                          {item.daysRemaining} day{item.daysRemaining !== 1 ? "s" : ""} left
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(item)}
                  disabled={restoring.has(item.id)}
                  className="gap-1"
                >
                  <RotateCcwIcon className="size-3" />
                  {restoring.has(item.id) ? "..." : "Restore"}
                </Button>
                {isDean && (
                  <ConfirmDialog
                    title="Permanently delete?"
                    description={`Permanently delete "${item.name}"? This cannot be undone.`}
                    confirmLabel="Purge"
                    destructive
                    onConfirm={() => handlePurge(item)}
                    loading={purging.has(item.id)}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={purging.has(item.id)}
                        className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2Icon className="size-3" />
                        {purging.has(item.id) ? "..." : "Purge"}
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
      )}
    </div>
  )
}

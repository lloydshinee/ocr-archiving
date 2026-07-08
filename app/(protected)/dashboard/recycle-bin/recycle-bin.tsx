"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Trash2Icon, RotateCcwIcon, FolderIcon, FileIcon, AlertTriangleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
  const [restoring, setRestoring] = useState<Set<string>>(new Set())
  const [purging, setPurging] = useState<Set<string>>(new Set())

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/recycle-bin")
      if (!res.ok) throw new Error("Failed to load recycle bin")
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      toast.error("Failed to load recycle bin")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

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
      fetchItems()
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
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return

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
      fetchItems()
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

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="divide-y">
        {items.map((item) => {
          const isExpired = item.daysRemaining <= 0

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {item.type === "folder" ? (
                  <FolderIcon className="size-4 shrink-0 text-primary" />
                ) : (
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePurge(item)}
                    disabled={purging.has(item.id)}
                    className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon className="size-3" />
                    {purging.has(item.id) ? "..." : "Purge"}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArchiveIcon, ArchiveRestoreIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DocumentActionsProps {
  documentId: string
  documentTitle: string
  isArchived: boolean
  canArchive: boolean
  canDelete: boolean
}

export function DocumentActions({
  documentId,
  documentTitle,
  isArchived: initialArchived,
  canArchive,
  canDelete,
}: DocumentActionsProps) {
  const [isArchived, setIsArchived] = useState(initialArchived)
  const [loading, setLoading] = useState(false)

  const handleArchive = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: !isArchived }),
      })
      if (res.ok) {
        setIsArchived(!isArchived)
        toast.success(isArchived ? "Document unarchived" : "Document archived")
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Move "${documentTitle}" to the Recycle Bin?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Document moved to Recycle Bin")
        window.history.back()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canArchive && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleArchive}
          disabled={loading}
          className="gap-1.5"
        >
          {isArchived ? (
            <>
              <ArchiveRestoreIcon className="size-3.5" />
              Unarchive
            </>
          ) : (
            <>
              <ArchiveIcon className="size-3.5" />
              Archive
            </>
          )}
        </Button>
      )}

      {canDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
          className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <Trash2Icon className="size-3.5" />
          Delete
        </Button>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArchiveIcon, ArchiveRestoreIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface DocumentActionsProps {
  documentId: string
  documentTitle: string
  isArchived: boolean
  isLocked?: boolean
  canArchive: boolean
  canDelete: boolean
}

export function DocumentActions({
  documentId,
  documentTitle,
  isArchived: initialArchived,
  isLocked,
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
          disabled={loading || isLocked}
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

      {canDelete && !isLocked && (
        <ConfirmDialog
          title="Move to Recycle Bin?"
          description={`Move "${documentTitle}" to the Recycle Bin? It will be permanently deleted after 30 days.`}
          confirmLabel="Move to Bin"
          destructive
          onConfirm={handleDelete}
          loading={loading}
          trigger={
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2Icon className="size-3.5" />
              Delete
            </Button>
          }
        />
      )}

      {isLocked && (
        <span
          className="px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] bg-destructive/15 text-destructive font-medium self-center"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Locked
        </span>
      )}
    </div>
  )
}

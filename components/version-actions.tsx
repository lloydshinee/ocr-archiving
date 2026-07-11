"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { EyeIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { DocumentViewer } from "@/components/document-viewer"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "sonner"

interface VersionActionsProps {
  documentId: string
  versionId: string
  versionNumber: number
  fileName: string
  fileType: string
  isCurrent: boolean
  title: string
}

export function VersionActions({
  documentId,
  versionId,
  versionNumber,
  fileName,
  fileType,
  isCurrent,
  title,
}: VersionActionsProps) {
  const router = useRouter()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleRestore = async () => {
    setRestoring(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to restore version")
        return
      }
      toast.success(`Version v${versionNumber} restored`)
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setRestoring(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/documents/${documentId}/versions/${versionId}`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to delete version")
        return
      }
      toast.success(`Version v${versionNumber} deleted`)
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        title="View this version"
      >
        <EyeIcon className="size-3.5" />
      </button>

      <a
        href={`/api/documents/${documentId}/download?version=${versionId}`}
        className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        title="Download this version"
      >
        <svg
          className="size-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      </a>

      {!isCurrent && (
        <>
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="Restore this version"
          >
            <RotateCcwIcon className={`size-3.5 ${restoring ? "animate-spin" : ""}`} />
          </button>

          <ConfirmDialog
            title="Delete version"
            description={`Delete version v${versionNumber} (${fileName})? This cannot be undone.`}
            confirmLabel="Delete"
            destructive
            onConfirm={handleDelete}
            loading={deleting}
            trigger={
              <button
                type="button"
                disabled={deleting}
                className="rounded p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                title="Delete this version"
              >
                <Trash2Icon className={`size-3.5 ${deleting ? "animate-spin" : ""}`} />
              </button>
            }
          />
        </>
      )}

      <DocumentViewer
        documentId={documentId}
        title={`${title} (v${versionNumber})`}
        fileType={fileType}
        versionId={versionId}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  )
}

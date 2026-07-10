"use client"

import { useState } from "react"
import { EyeIcon } from "lucide-react"
import { DocumentViewer } from "@/components/document-viewer"

interface ViewButtonProps {
  documentId: string
  title: string
  fileType: string
}

export function ViewButton({ documentId, title, fileType }: ViewButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        <EyeIcon className="size-4" /> View
      </button>
      <DocumentViewer
        documentId={documentId}
        title={title}
        fileType={fileType}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

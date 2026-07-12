"use client"

import { useState } from "react"
import { OcrViewerDialog } from "@/components/ocr-viewer-dialog"

interface OcrViewerButtonProps {
  documentId: string
  title: string
  status: string
}

export function OcrViewerButton({ documentId, title, status }: OcrViewerButtonProps) {
  const [open, setOpen] = useState(false)

  if (status !== "completed") {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted/30 text-muted-foreground hover:bg-muted/60 transition-colors"
        style={{ fontFamily: "var(--font-mono)" }}
        title="View extracted text"
      >
        OCR complete
      </button>
      <OcrViewerDialog
        documentId={documentId}
        open={open}
        onClose={() => setOpen(false)}
        title={title}
      />
    </>
  )
}

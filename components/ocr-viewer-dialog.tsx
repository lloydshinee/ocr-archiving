"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeftIcon, ChevronRightIcon, FileTextIcon, Loader2Icon } from "lucide-react"

interface OcrViewerDialogProps {
  documentId: string
  open: boolean
  onClose: () => void
  title: string
}

export function OcrViewerDialog({ documentId, open, onClose, title }: OcrViewerDialogProps) {
  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setPages([])
      setCurrentPage(0)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/documents/${documentId}/ocr-text`)
      .then((res) => {
        if (!res.ok) throw new Error("OCR text not available")
        return res.json()
      })
      .then((data) => {
        setPages(data.pages)
        setCurrentPage(0)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [documentId, open])

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(0, p - 1))
  }, [])

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
  }, [pages.length])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-4" />
            Extracted text — {title}
          </DialogTitle>
          {!loading && !error && pages.length > 0 && (
            <p className="text-[11px] text-muted-foreground/60 mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {pages.reduce((sum, p) => sum + p.length, 0).toLocaleString()} chars total
              {pages.length > 1 && ` · ${pages[currentPage].length.toLocaleString()} on this page`}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <FileTextIcon className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <ScrollArea className="h-[55vh] rounded-lg border bg-muted/30 p-5">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                {pages[currentPage] || ""}
              </pre>
            </ScrollArea>
          )}
        </div>

        {pages.length > 1 && !loading && !error && (
          <div className="flex items-center justify-between border-t pt-3 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeftIcon className="size-4" />
              Prev
            </Button>
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              Page {currentPage + 1} of {pages.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === pages.length - 1}
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

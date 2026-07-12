"use client"

import { useState, useCallback, useEffect } from "react"
import {
  XIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  FileImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface DocumentViewerProps {
  documentId: string
  title: string
  fileType: string
  versionId?: string
  open: boolean
  onClose: () => void
}

function isViewableInline(mime: string) {
  return (
    mime === "application/pdf" ||
    mime.startsWith("image/") ||
    mime === "text/plain"
  )
}

function isImage(mime: string) {
  return mime.startsWith("image/")
}

function isPdf(mime: string) {
  return mime === "application/pdf"
}

function isText(mime: string) {
  return mime === "text/plain"
}

export function DocumentViewer({
  documentId,
  title,
  fileType,
  versionId,
  open,
  onClose,
}: DocumentViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState(false)

  const viewUrl = versionId
    ? `/api/documents/${documentId}/view?version=${versionId}`
    : `/api/documents/${documentId}/view`

  const downloadUrl = versionId
    ? `/api/documents/${documentId}/download?version=${versionId}`
    : `/api/documents/${documentId}/download`

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose],
  )

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b bg-popover px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {isPdf(fileType) ? (
                <FileIcon className="size-5 shrink-0 text-destructive" />
              ) : isImage(fileType) ? (
                <FileImageIcon className="size-5 shrink-0 text-orange-400" />
              ) : (
                <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
              )}
              <h2 className="text-sm font-medium truncate">{title}</h2>
            </div>

            <div className="flex items-center gap-1">
              {!isViewableInline(fileType) && (
                <a
                  href={downloadUrl}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <DownloadIcon className="size-3.5" />
                  Download to view
                </a>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto bg-[#1a1a1a]">
            {isViewableInline(fileType) ? (
              <>
                {isPdf(fileType) && (
                  <iframe
                    src={viewUrl}
                    className="h-full w-full"
                    title={title}
                  />
                )}

                {isImage(fileType) && (
                  <div className="flex h-full items-center justify-center p-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewUrl}
                      alt={title}
                      className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                    />
                  </div>
                )}

                {isText(fileType) && (
                  <TextViewer
                    url={viewUrl}
                    content={textContent}
                    setContent={setTextContent}
                    loading={textLoading}
                    setLoading={setTextLoading}
                    error={textError}
                    setError={setTextError}
                  />
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
                <FileIcon className="size-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Preview not available for this file type
                </p>
                <a
                  href={downloadUrl}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <DownloadIcon className="size-4" />
                  Download to view
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function TextViewer({
  url,
  content,
  setContent,
  loading,
  setLoading,
  error,
  setError,
}: {
  url: string
  content: string | null
  setContent: (v: string | null) => void
  loading: boolean
  setLoading: (v: boolean) => void
  error: boolean
  setError: (v: boolean) => void
}) {
  useEffect(() => {
    if (content !== null || loading || error) return
    setLoading(true)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.text()
      })
      .then((t) => {
        setContent(t)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [url, content, loading, error, setContent, setLoading, setError])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Failed to load file</p>
        <a
          href={url}
          className="text-sm text-primary underline underline-offset-3 hover:text-primary/80"
        >
          Download instead
        </a>
      </div>
    )
  }

  return (
    <pre className="h-full overflow-auto p-6 text-sm leading-relaxed text-zinc-200 font-mono whitespace-pre-wrap">
      {content}
    </pre>
  )
}

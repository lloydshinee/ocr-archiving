"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { UploadIcon, LightbulbIcon, SearchIcon, FolderIcon, CheckCircleIcon } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { FolderCombobox } from "@/components/folder-combobox"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { OcrStatusBadge } from "@/components/ocr-status-badge"
import { OcrViewerButton } from "@/components/ocr-viewer-button"
import { TEXT_EXTRACTABLE_TYPES } from "@/lib/constants"
import type { FolderSuggestion } from "@/lib/document-classifier"
import { toast } from "sonner"

export function SmartDropZone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<FolderSuggestion[]>([])
  const [timedOut, setTimedOut] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [allFolders, setAllFolders] = useState<{ id: string; name: string; parentPath: string }[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedDoc, setUploadedDoc] = useState<{ id: string; title: string; fileType: string; versionId: string } | null>(null)
  const [ocrStatus, setOcrStatus] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.folders) {
          setAllFolders(
            d.folders.map((f: { id: string; name: string; parent_id?: string | null }) => ({
              id: f.id,
              name: f.name,
              parentPath: "",
            })),
          )
        }
      })
      .catch(() => {})
  }, [])

  function triggerFileDialog() {
    inputRef.current?.click()
  }

  function handleFile(file: File) {
    setDroppedFile(file)
    setSuggestions([])
    setTimedOut(false)
    setSelectedFolderId(null)
    setAnalyzing(true)
    setShowDialog(true)

    const formData = new FormData()
    formData.append("file", file)

    fetch("/api/suggest-folder", { method: "POST", body: formData })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const s = (data?.suggestions as FolderSuggestion[]) ?? []
        setSuggestions(s)
        setTimedOut(data?.timed_out === true)
        if (s.length > 0) {
          setSelectedFolderId(s[0].folderId)
        }
      })
      .catch(() => {
        toast.error("Failed to analyze file")
      })
      .finally(() => {
        setAnalyzing(false)
      })
  }

  async function handleUpload() {
    if (!droppedFile || !selectedFolderId) return
    setUploading(true)
    const toastId = toast.loading("Uploading...")

    try {
      const formData = new FormData()
      formData.append("folderId", selectedFolderId)
      formData.append("files", droppedFile)

      const res = await fetch("/api/documents/bulk", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        toast.dismiss(toastId)
        const data = await res.json()
        const doc = data.documents?.[0]
        if (doc?.id) {
          setUploadedDoc({ id: doc.id, title: doc.title ?? droppedFile.name, fileType: droppedFile.type, versionId: "" })
          setOcrStatus(TEXT_EXTRACTABLE_TYPES.includes(droppedFile.type) ? "pending" : null)
        } else {
          setShowDialog(false)
          setDroppedFile(null)
          router.refresh()
        }
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Upload failed", { id: toastId })
      }
    } catch {
      toast.error("Something went wrong", { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!uploadedDoc || !TEXT_EXTRACTABLE_TYPES.includes(uploadedDoc.fileType)) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${uploadedDoc.id}`)
        if (!res.ok) return
        const data = await res.json()
        const version = data.versions?.[0]
        if (!version?.ocr_status) return
        setOcrStatus(version.ocr_status)
        setUploadedDoc((prev) => prev ? { ...prev, versionId: version.id } : prev)
        if (version.ocr_status === "completed" || version.ocr_status === "failed") {
          clearInterval(interval)
        }
      } catch {
        // keep polling
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [uploadedDoc])

  const handleFinish = useCallback(() => {
    setShowDialog(false)
    setDroppedFile(null)
    setSuggestions([])
    setTimedOut(false)
    setSelectedFolderId(null)
    setUploadedDoc(null)
    setOcrStatus(null)
    router.refresh()
  }, [router])

  function handleDialogClose() {
    if (uploadedDoc) {
      setShowDialog(false)
      setDroppedFile(null)
      setSuggestions([])
      setTimedOut(false)
      setSelectedFolderId(null)
      setUploadedDoc(null)
      setOcrStatus(null)
      router.refresh()
    } else {
      setShowDialog(false)
      setDroppedFile(null)
      setSuggestions([])
      setTimedOut(false)
      setSelectedFolderId(null)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ""
        }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          const f = e.dataTransfer?.files?.[0]
          if (f) handleFile(f)
        }}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30"
        }`}
        onClick={triggerFileDialog}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-3">
            <LightbulbIcon className="size-6 text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-medium">Smart Drop</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drop a file here to find which folder it belongs in
            </p>
          </div>
          <Button size="sm" variant="outline" className="mt-1 gap-1.5 text-xs">
            <UploadIcon className="size-3.5" />
            Browse files
          </Button>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={(v) => { if (!v) handleDialogClose() }}>
        <DialogContent className="sm:max-w-lg">
          {uploadedDoc ? (
            <>
              <DialogHeader>
                <DialogTitle>Uploaded successfully</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                  <CheckCircleIcon className="size-5 shrink-0 text-green-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{uploadedDoc.title}</p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {droppedFile && (droppedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                {TEXT_EXTRACTABLE_TYPES.includes(uploadedDoc.fileType) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground/70">Text extraction:</span>
                    {ocrStatus === "completed" ? (
                      <OcrViewerButton documentId={uploadedDoc.id} title={uploadedDoc.title} status="completed" />
                    ) : (
                      <OcrStatusBadge status={ocrStatus ?? "pending"} versionId={uploadedDoc.versionId || undefined} />
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" onClick={handleFinish}>
                    Done
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {analyzing ? "Analyzing file..." : "Where should this go?"}
                </DialogTitle>
                <DialogDescription>
                  {droppedFile?.name}
                </DialogDescription>
              </DialogHeader>

              {analyzing ? (
                <div className="flex flex-col gap-4 py-6">
                  <div className="flex items-center gap-3">
                    <Progress className="flex-1" />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Extracting content and searching folders...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {timedOut && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Analysis timed out — showing filename-based suggestions
                    </p>
                  )}

                  {suggestions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-[0.1em]">
                        Suggestions
                      </p>
                      {suggestions.map((s) => {
                        const folder = allFolders.find((f) => f.id === s.folderId)
                        return (
                          <button
                            key={s.folderId}
                            type="button"
                            onClick={() => setSelectedFolderId(s.folderId)}
                            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                              selectedFolderId === s.folderId
                                ? "border-primary bg-primary/5"
                                : "border-transparent bg-muted/50 hover:bg-muted"
                            }`}
                          >
                            <FolderIcon className="size-4 shrink-0 text-primary/60" />
                            <div className="min-w-0 flex-1">
                              <span className="truncate font-medium">{folder?.name ?? "Unknown folder"}</span>
                              {folder?.parentPath && (
                                <span className="ml-2 text-[10px] text-muted-foreground/60">
                                  {folder.parentPath}
                                </span>
                              )}
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground/50 font-mono">
                              {s.score} match{s.score !== 1 ? "es" : ""}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <SearchIcon className="size-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No matching folders found</p>
                      <p className="text-xs text-muted-foreground/50">Choose a destination manually below</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-[0.1em]">
                      Or choose manually
                    </p>
                    <FolderCombobox
                      folders={allFolders}
                      value={selectedFolderId ?? ""}
                      onChange={(id) => setSelectedFolderId(id)}
                      placeholder="Search folders..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleUpload} disabled={!selectedFolderId || uploading}>
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { UploadIcon, PencilIcon, FileIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.txt,.zip"

interface ExistingDocument {
  id: string
  title: string
  description: string | null
  category_id: string | null
  document_type_id: string | null
  tags: { id: string; name: string }[]
}

interface DocumentDialogProps {
  mode: "upload" | "edit"
  folderId: string
  folderName: string
  document?: ExistingDocument
  trigger?: React.ReactElement
}

export function DocumentDialog({
  mode,
  folderId,
  folderName,
  document,
  trigger,
}: DocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [documentTypeId, setDocumentTypeId] = useState("")
  const [tags, setTags] = useState("")
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [documentTypes, setDocumentTypes] = useState<{ id: string; name: string }[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const isEdit = mode === "edit"

  useEffect(() => {
    if (!open) return

    async function load() {
      const [catRes, typeRes] = await Promise.all([
        fetch("/api/folders/categories"),
        fetch("/api/folders/document-types"),
      ])

      if (catRes.ok) {
        const data = await catRes.json()
        setCategories(data.categories ?? [])
      }

      if (typeRes.ok) {
        const data = await typeRes.json()
        setDocumentTypes(data.documentTypes ?? [])
      }
    }

    load()
  }, [open])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open && document) {
      setTitle(document.title)
      setDescription(document.description ?? "")
      setCategoryId(document.category_id ?? "")
      setDocumentTypeId(document.document_type_id ?? "")
      setTags(document.tags.map((t) => t.name).join(", "))
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, document])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    if (selected && !title && !isEdit) {
      setTitle(selected.name.replace(/\.[^.]+$/, ""))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      setFile(dropped)
      if (!title && !isEdit) {
        setTitle(dropped.name.replace(/\.[^.]+$/, ""))
      }
    }
  }, [title, isEdit])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isEdit) {
      setLoading(true)
      try {
        if (file) {
          const versionForm = new FormData()
          versionForm.append("file", file)
          const versionRes = await fetch(
            `/api/documents/${document!.id}/versions?replace=true`,
            { method: "POST", body: versionForm },
          )
          if (!versionRes.ok) {
            const data = await versionRes.json()
            setError(data.error ?? "Failed to replace file")
            return
          }
        }

        const body: Record<string, string> = {}
        if (title.trim()) body.title = title.trim()
        body.description = description.trim()
        if (categoryId) body.categoryId = categoryId
        if (documentTypeId) body.documentTypeId = documentTypeId
        body.tags = tags.trim()

        const res = await fetch(`/api/documents/${document!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? "Failed to update")
          return
        }
        toast.success("Document updated")
        setOpen(false)
        reset()
        router.refresh()
      } catch {
        setError("Something went wrong")
      } finally {
        setLoading(false)
      }
      return
    }

    if (!file) {
      setError("Please select a file")
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folderId", folderId)
      if (title.trim()) formData.append("title", title.trim())
      if (description.trim()) formData.append("description", description.trim())
      if (categoryId) formData.append("categoryId", categoryId)
      if (documentTypeId) formData.append("documentTypeId", documentTypeId)
      if (tags.trim()) formData.append("tags", tags.trim())

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to upload")
        return
      }

      toast.success("Document uploaded")
      setOpen(false)
      reset()
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setTitle("")
    setDescription("")
    setCategoryId("")
    setDocumentTypeId("")
    setTags("")
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function syncFromDocument() {
    if (!document) return
    setTitle(document.title)
    setDescription(document.description ?? "")
    setCategoryId(document.category_id ?? "")
    setDocumentTypeId(document.document_type_id ?? "")
    setTags(document.tags.map((t) => t.name).join(", "))
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) {
      if (!isEdit) reset()
      else syncFromDocument()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          render={
            <Button size="sm" type="button">
              {isEdit ? (
                <><PencilIcon className="size-4" /> Edit</>
              ) : (
                <><UploadIcon className="size-4" /> Upload file</>
              )}
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit document" : "Upload document"}
          </DialogTitle>
        </DialogHeader>
        <p
          className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {isEdit ? `Editing "${document?.title}"` : `to ${folderName}`}
        </p>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="file"
                className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {isEdit ? "Replace file (optional)" : "File"}
              </Label>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : file
                      ? "border-primary/50 bg-muted/30"
                      : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/20"
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex items-center gap-3">
                    <FileIcon className="size-6 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-64">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile()
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadIcon className="size-6 text-muted-foreground/60" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Click to browse
                        </span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                        PDF, DOCX, XLSX, PPTX, JPG, PNG, TXT, ZIP — up to 100MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="title"
                  className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="category"
                  className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Category
                </Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="docType"
                  className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Document type
                </Label>
                <select
                  id="docType"
                  value={documentTypeId}
                  onChange={(e) => setDocumentTypeId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">None</option>
                  {documentTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="tags"
                  className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Tags
                </Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. handbook, 2026, policy"
                />
                <p className="text-[11px] text-muted-foreground/50">
                  Comma-separated
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="description"
                className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Description
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEdit ? "Saving..." : "Uploading..."
                  : isEdit ? "Save changes" : "Upload"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  )
}

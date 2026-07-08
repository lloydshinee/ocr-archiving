"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UploadIcon } from "lucide-react"
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

interface UploadDocumentDialogProps {
  folderId: string
  folderName: string
}

export function UploadDocumentDialog({ folderId, folderName }: UploadDocumentDialogProps) {
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
  const router = useRouter()

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ""))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger
        render={
          <Button size="sm" type="button">
            <UploadIcon className="size-4" /> Upload file
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <p
          className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          to {folderName}
        </p>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="file"
                className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                File
              </Label>
              <Input
                id="file"
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileChange}
              />
              <p className="text-[11px] text-muted-foreground/50">
                PDF, DOCX, XLSX, PPTX, JPG, PNG, TXT, ZIP — up to 100MB
              </p>
            </div>

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
                htmlFor="description"
                className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
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
                {loading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  )
}

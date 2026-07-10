"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  FolderIcon,
  FileIcon,
  MoreHorizontalIcon,
  ArchiveIcon,
  Trash2Icon,
  PencilIcon,
  FileTextIcon,
  EyeIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { DocumentDialog } from "@/components/document-dialog"
import { DocumentViewer } from "@/components/document-viewer"

interface Subfolder {
  id: string
  name: string
  updated_at: string
  owner_id: string
}

interface DocumentItem {
  id: string
  title: string
  file_type: string
  owner_id: string
  created_at: string
  current_version_id: string | null
}

interface FolderContentProps {
  folderId: string
  folderName: string
  subfolders: Subfolder[]
  documents: DocumentItem[]
  versionCounts: Map<string, number>
  documentOwners: Map<string, string>
}

function fileTypeIcon(mime: string) {
  if (mime.includes("pdf")) return <FileIcon className="size-4 shrink-0" />
  if (mime.includes("image")) return <FileIcon className="size-4 shrink-0 text-orange-400" />
  if (mime.includes("spreadsheet")) return <FileIcon className="size-4 shrink-0 text-green-500" />
  if (mime.includes("presentation")) return <FileIcon className="size-4 shrink-0 text-red-400" />
  return <FileIcon className="size-4 shrink-0 text-muted-foreground" />
}

export function FolderContent({
  folderId,
  folderName,
  subfolders,
  documents,
  versionCounts,
  documentOwners,
}: FolderContentProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<{ id: string; title: string; fileType: string } | null>(null)

  const handleArchiveDoc = async (docId: string, currentlyArchived: boolean) => {
    setLoadingId(docId)
    try {
      const res = await fetch(`/api/documents/${docId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: !currentlyArchived }),
      })
      if (res.ok) {
        toast.success(currentlyArchived ? "Document unarchived" : "Document archived")
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoadingId(null)
    }
  }

  const handleDeleteDoc = async (docId: string, title: string) => {
    if (!confirm(`Move "${title}" to the Recycle Bin?`)) return
    setLoadingId(docId)
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Document moved to Recycle Bin")
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoadingId(null)
    }
  }

  const handleArchiveFolder = async (sfId: string, currentlyArchived: boolean) => {
    setLoadingId(sfId)
    try {
      const res = await fetch(`/api/folders/${sfId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: !currentlyArchived }),
      })
      if (res.ok) {
        toast.success(currentlyArchived ? "Folder unarchived" : "Folder archived")
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoadingId(null)
    }
  }

  const handleDeleteFolder = async (sfId: string, name: string) => {
    if (!confirm(`Move "${name}" to the Recycle Bin?`)) return
    setLoadingId(sfId)
    try {
      const res = await fetch(`/api/folders/${sfId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Folder moved to Recycle Bin")
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoadingId(null)
    }
  }

  const hasItems = subfolders.length > 0 || documents.length > 0

  if (!hasItems) {
    return (
      <>
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-card shadow-sm">
          <FileTextIcon className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-1">
            This folder is empty
          </p>
          <p
            className="text-[11px] text-muted-foreground/50"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Upload a document or create a subfolder
          </p>
        </div>
        {viewingDoc && (
          <DocumentViewer
            documentId={viewingDoc.id}
            title={viewingDoc.title}
            fileType={viewingDoc.fileType}
            open={!!viewingDoc}
            onClose={() => setViewingDoc(null)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="divide-y">
        {subfolders.map((sf) => (
          <div
            key={sf.id}
            className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
          >
            <a
              href={`/dashboard/folders/${sf.id}`}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <FolderIcon className="size-4 shrink-0 text-primary" />
              <span className="truncate text-sm">{sf.name}</span>
            </a>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className="text-[11px] text-muted-foreground/50"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {new Date(sf.updated_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={loadingId === sf.id}
                    >
                      <MoreHorizontalIcon className="size-3.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => handleArchiveFolder(sf.id, false)}
                  >
                    <ArchiveIcon className="size-3.5" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleDeleteFolder(sf.id, sf.name)}
                  >
                    <Trash2Icon className="size-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {documents.map((doc) => {
          const existingTags: { id: string; name: string }[] = []

          return (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <a
                href={`/dashboard/documents/${doc.id}`}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                {fileTypeIcon(doc.file_type)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">{doc.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {versionCounts.get(doc.id) ?? 1} version{(versionCounts.get(doc.id) ?? 1) !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground/50">
                    <span>{documentOwners.get(doc.owner_id) ?? "Unknown"}</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {new Date(doc.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </a>
              <div className="flex items-center gap-1 shrink-0">
                <DocumentDialog
                  mode="edit"
                  folderId={folderId}
                  folderName={folderName}
                  document={{
                    id: doc.id,
                    title: doc.title,
                    description: null,
                    category_id: null,
                    document_type_id: null,
                    tags: existingTags,
                  }}
                  trigger={
                    <Button variant="ghost" size="icon" className="size-7">
                      <PencilIcon className="size-3.5" />
                    </Button>
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={loadingId === doc.id}
                      >
                        <MoreHorizontalIcon className="size-3.5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() =>
                        setViewingDoc({
                          id: doc.id,
                          title: doc.title,
                          fileType: doc.file_type,
                        })
                      }
                    >
                      <EyeIcon className="size-3.5" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchiveDoc(doc.id, false)}
                    >
                      <ArchiveIcon className="size-3.5" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDeleteDoc(doc.id, doc.title)}
                    >
                      <Trash2Icon className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>
    </div>
      {viewingDoc && (
        <DocumentViewer
          documentId={viewingDoc.id}
          title={viewingDoc.title}
          fileType={viewingDoc.fileType}
          open={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </>
  )
}

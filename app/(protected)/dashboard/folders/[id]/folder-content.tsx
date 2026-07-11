"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FolderIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  ArchiveIcon,
  Trash2Icon,
  PencilIcon,
  EyeIcon,
  SearchIcon,
  FolderOpenIcon,
} from "lucide-react"
import { fileTypeIcon } from "@/lib/file-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "text/plain": "TXT",
  "application/zip": "ZIP",
}

interface Subfolder {
  id: string
  name: string
  updated_at: string
  owner_id: string
  category_id: string | null
}

interface DocumentItem {
  id: string
  title: string
  file_type: string
  owner_id: string
  created_at: string
  current_version_id: string | null
  category_id: string | null
}

interface FolderContentProps {
  folderId: string
  folderName: string
  subfolders: Subfolder[]
  documents: DocumentItem[]
  versionCounts: Map<string, number>
  documentOwners: Map<string, string>
  subfolderCategoryNames: Map<string, string>
  docCategoryNames: Map<string, string>
  currentUserId: string
  userRole: string
  folderProgramId: string | null
  canArchive: boolean
  canDelete: boolean
  isLocked: boolean
}

export function FolderContent({
  folderId,
  folderName,
  subfolders,
  documents,
  versionCounts,
  documentOwners,
  subfolderCategoryNames,
  docCategoryNames,
  currentUserId,
  userRole,
  folderProgramId,
  canArchive,
  canDelete,
  isLocked,
}: FolderContentProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<{ id: string; title: string; fileType: string } | null>(null)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "folder" | "document"
    id: string
    name: string
  } | null>(null)

  const filteredSubfolders = useMemo(() => {
    if (filterType !== "all" && filterType !== "folders") return []
    if (!search.trim()) return subfolders
    const q = search.toLowerCase()
    return subfolders.filter((sf) => sf.name.toLowerCase().includes(q))
  }, [subfolders, search, filterType])

  const fileTypes = useMemo(() => {
    const types = new Set(documents.map((d) => d.file_type))
    return Array.from(types).sort()
  }, [documents])

  const filteredDocuments = useMemo(() => {
    if (filterType === "folders") return []
    let result = documents
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.title.toLowerCase().includes(q))
    }
    if (filterType !== "all") {
      result = result.filter((d) => d.file_type === filterType)
    }
    return result
  }, [documents, search, filterType])

  function canEditDoc(ownerId: string) {
    if (userRole === "dean") return true
    if (userRole === "program_head" && folderProgramId) return true
    return ownerId === currentUserId
  }

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

  const countLabel = filterType === "folders"
    ? `${filteredSubfolders.length} folder${filteredSubfolders.length !== 1 ? "s" : ""}`
    : filterType !== "all"
      ? `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? "s" : ""}`
      : `${subfolders.length} folder${subfolders.length !== 1 ? "s" : ""} \u00B7 ${documents.length} document${documents.length !== 1 ? "s" : ""}`

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm">
        {!hasItems ? (
          <div className="flex flex-col items-center gap-3 py-16">
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
        ) : (
          <>
            <div className="flex items-center gap-3 px-5 py-3 border-b">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="h-8 pl-8 pr-3 text-xs border-0 bg-muted/50 focus-visible:bg-muted rounded-md"
                />
              </div>
              <span
                className="text-[11px] text-muted-foreground/50 shrink-0"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {countLabel}
              </span>
            </div>

            {(subfolders.length > 0 || fileTypes.length > 0) && (
              <div className="flex items-center gap-1.5 px-5 py-2.5 border-b bg-muted/20">
                {fileTypes.length > 0 && (
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterType === "all"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    All
                  </button>
                )}
                {subfolders.length > 0 && (
                  <button
                    onClick={() => setFilterType("folders")}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterType === "folders"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    Folders
                  </button>
                )}
                {fileTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterType === t
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {FILE_TYPE_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
            )}

            <div className="divide-y">
              {filteredSubfolders.map((sf) => (
                <div
                  key={sf.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
                >
                  <a
                    href={`/dashboard/folders/${sf.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <FolderIcon className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm">{sf.name}</span>
                        {sf.category_id && subfolderCategoryNames.has(sf.category_id) && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {subfolderCategoryNames.get(sf.category_id)}
                          </Badge>
                        )}
                      </div>
                    </div>
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
                    {(canArchive || canDelete) && !isLocked && (
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
                          {canArchive && !isLocked && (
                            <DropdownMenuItem
                              onClick={() => handleArchiveFolder(sf.id, false)}
                            >
                              <ArchiveIcon className="size-3.5" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {canDelete && !isLocked && (
                            <>
                              {canArchive && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setConfirmDelete({ type: "folder", id: sf.id, name: sf.name })}
                              >
                                <Trash2Icon className="size-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}

              {(filteredSubfolders.length > 0 && filteredDocuments.length > 0) && (
                <div className="px-5 py-2">
                  <div className="border-t" />
                </div>
              )}

              {filteredDocuments.map((doc) => {
                const existingTags: { id: string; name: string }[] = []

                return (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
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
                        {doc.category_id && docCategoryNames.has(doc.category_id) && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {docCategoryNames.get(doc.category_id)}
                          </Badge>
                        )}
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
                      {(canEditDoc(doc.owner_id) && !isLocked) && (
                        <DocumentDialog
                          mode="edit"
                          folderId={folderId}
                          folderName={folderName}
                          document={{
                            id: doc.id,
                            title: doc.title,
                            description: null,
                            category_id: doc.category_id,
                            document_type_id: null,
                            tags: existingTags,
                          }}
                          trigger={
                            <Button variant="ghost" size="icon" className="size-7">
                              <PencilIcon className="size-3.5" />
                            </Button>
                          }
                        />
                      )}
                      {!isLocked && (
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
                          {canArchive && !isLocked && (
                            <DropdownMenuItem
                              onClick={() => handleArchiveDoc(doc.id, false)}
                            >
                              <ArchiveIcon className="size-3.5" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {canDelete && !isLocked && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setConfirmDelete({ type: "document", id: doc.id, name: doc.title })}
                              >
                                <Trash2Icon className="size-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              })}

              {filteredSubfolders.length === 0 && filteredDocuments.length === 0 && search && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <FolderOpenIcon className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No results matching &ldquo;{search}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </>
        )}
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

      <AlertDialog
        open={confirmDelete != null}
        onOpenChange={(v) => { if (!v) setConfirmDelete(null) }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Recycle Bin?</AlertDialogTitle>
            <AlertDialogDescription>
              Move &ldquo;{confirmDelete?.name}&rdquo; to the Recycle Bin? It will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingId != null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={loadingId != null}
              onClick={() => {
                if (!confirmDelete) return
                if (confirmDelete.type === "folder") {
                  handleDeleteFolder(confirmDelete.id, confirmDelete.name)
                } else {
                  handleDeleteDoc(confirmDelete.id, confirmDelete.name)
                }
                setConfirmDelete(null)
              }}
            >
              {loadingId != null ? "..." : "Move to Bin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

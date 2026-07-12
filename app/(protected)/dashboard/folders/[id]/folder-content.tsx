"use client"

import { useMemo, useState, useCallback, useEffect } from "react"
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
  MoveIcon,
  LockIcon,
  CheckIcon,
} from "lucide-react"
import { fileTypeIcon } from "@/lib/file-icons"
import { FILE_TYPE_LABELS, TEXT_EXTRACTABLE_TYPES } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import { MoveDialog } from "@/components/move-dialog"
import { BatchActionsToolbar } from "@/components/batch-actions-toolbar"
import { DragUploadOverlay } from "@/components/drag-upload-overlay"
import { OcrViewerButton } from "@/components/ocr-viewer-button"
import { OcrViewerDialog } from "@/components/ocr-viewer-dialog"
import { useSelection } from "@/hooks/use-selection"
import { batchArchive, batchDelete } from "@/lib/batch-operations"

interface Subfolder {
  id: string
  name: string
  updated_at: string
  owner_id: string
  category_id: string | null
  is_locked: boolean
  is_archived: boolean
}

interface DocumentItem {
  id: string
  title: string
  file_type: string
  owner_id: string
  created_at: string
  current_version_id: string | null
  category_id: string | null
  is_archived: boolean
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
  canMove: boolean
  canCreate: boolean
  isLocked: boolean
  documentOcrStatus: Map<string, string>
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
  canMove,
  canCreate,
  isLocked,
  documentOcrStatus,
}: FolderContentProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<{ id: string; title: string; fileType: string } | null>(null)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "folder" | "document"
    id: string
    name: string
  } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [batchMoveOpen, setBatchMoveOpen] = useState(false)

  const filteredSubfolders = useMemo(() => {
    let items = subfolders
    if (!showArchived) items = items.filter((sf) => !sf.is_archived)
    if (filterType !== "all" && filterType !== "folders") return []
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((sf) => sf.name.toLowerCase().includes(q))
  }, [subfolders, search, filterType, showArchived])

  const fileTypes = useMemo(() => {
    const types = new Set(documents.map((d) => d.file_type))
    return Array.from(types).sort()
  }, [documents])

  const filteredDocuments = useMemo(() => {
    if (filterType === "folders") return []
    let result = documents
    if (!showArchived) result = result.filter((d) => !d.is_archived)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.title.toLowerCase().includes(q))
    }
    if (filterType !== "all") {
      result = result.filter((d) => d.file_type === filterType)
    }
    return result
  }, [documents, search, filterType, showArchived])

  const allVisibleIds = useMemo(
    () => [...filteredSubfolders.map((sf) => sf.id), ...filteredDocuments.map((d) => d.id)],
    [filteredSubfolders, filteredDocuments],
  )

  const sel = useSelection(allVisibleIds)

  const canHaveSelection = canCreate && !isLocked

  function canEditDoc(ownerId: string) {
    if (userRole === "dean") return true
    if (userRole === "program_head" && folderProgramId) return true
    return ownerId === currentUserId
  }

  function isLockedItem(id: string) {
    return subfolders.some((sf) => sf.id === id && sf.is_locked)
  }

  function canSelect(id: string) {
    if (userRole === "dean" || userRole === "program_head") return true
    return !isLockedItem(id)
  }

  const getSelectedItems = useCallback(() => {
    const items: { type: "folder" | "document"; id: string; name: string }[] = []
    for (const id of sel.selectedIds) {
      const sf = subfolders.find((f) => f.id === id)
      if (sf) items.push({ type: "folder", id: sf.id, name: sf.name })
      const doc = documents.find((d) => d.id === id)
      if (doc) items.push({ type: "document", id: doc.id, name: doc.title })
    }
    return items
  }, [sel.selectedIds, subfolders, documents])

  const handleBatchArchive = async () => {
    const items = getSelectedItems()
    await batchArchive(items, false)
    sel.exitSelectionMode()
    router.refresh()
  }

  const handleBatchDelete = async () => {
    const items = getSelectedItems()
    await batchDelete(items)
    sel.exitSelectionMode()
    router.refresh()
  }

  const handleBatchMove = () => {
    setBatchMoveOpen(true)
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

  useEffect(() => {
    if (!canHaveSelection) return

    function onDragOver(e: DragEvent) {
      e.preventDefault()
      setIsDragOver(true)
    }

    function onDragLeave(e: DragEvent) {
      if (e.clientX <= 0 || e.clientY <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragOver(false)
      }
    }

    async function onDrop(e: DragEvent) {
      e.preventDefault()
      setIsDragOver(false)
      if (uploading) return

      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return

      setUploading(true)
      const toastId = toast.loading(`Uploading ${files.length} file${files.length !== 1 ? "s" : ""}...`)

      try {
        const formData = new FormData()
        formData.append("folderId", folderId)
        for (const file of files) {
          formData.append("files", file)
        }

        const res = await fetch("/api/documents/bulk", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()
        const count = data.documents?.length ?? 0
        const errCount = data.errors?.length ?? 0

        if (errCount > 0) {
          toast.success(`Uploaded ${count} file${count !== 1 ? "s" : ""}, ${errCount} skipped`, { id: toastId })
        } else {
          toast.success(`Uploaded ${count} file${count !== 1 ? "s" : ""}`, { id: toastId })
        }

        router.refresh()
      } catch {
        toast.error("Upload failed", { id: toastId })
      } finally {
        setUploading(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (!sel.selectionMode) return
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault()
        sel.toggleAll()
      }
    }

    document.addEventListener("dragover", onDragOver)
    document.addEventListener("dragleave", onDragLeave)
    document.addEventListener("drop", onDrop)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("dragover", onDragOver)
      document.removeEventListener("dragleave", onDragLeave)
      document.removeEventListener("drop", onDrop)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [canHaveSelection, uploading, folderId, router, sel.selectionMode, sel.toggleAll])

  const hasItems = subfolders.length > 0 || documents.length > 0

  const countLabel = filterType === "folders"
    ? `${filteredSubfolders.length} folder${filteredSubfolders.length !== 1 ? "s" : ""}`
    : filterType !== "all"
      ? `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? "s" : ""}`
      : `${subfolders.length} folder${subfolders.length !== 1 ? "s" : ""} \u00B7 ${documents.length} document${documents.length !== 1 ? "s" : ""}`

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm">
        <DragUploadOverlay visible={isDragOver && !uploading} />

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
            {sel.selectionMode && sel.selectedCount > 0 ? (
              <BatchActionsToolbar
                selectedCount={sel.selectedCount}
                onArchive={handleBatchArchive}
                onDelete={handleBatchDelete}
                onMove={handleBatchMove}
                onCancel={sel.exitSelectionMode}
              />
            ) : (
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
                {canHaveSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => sel.setSelectionMode(true)}
                  >
                    <CheckIcon className="size-3.5" />
                    Select
                  </Button>
                )}
              </div>
            )}

            {(subfolders.length > 0 || fileTypes.length > 0) && !sel.selectionMode && (
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
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      showArchived
                        ? "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {showArchived ? "Hide archived" : "Show archived"}
                  </button>
                </div>
              </div>
            )}

            {sel.selectionMode && (
              <div className="flex items-center gap-1.5 px-5 py-2 border-b bg-muted/20">
                <Checkbox
                  checked={sel.allSelected}
                  onCheckedChange={() => sel.toggleAll()}
                  className="size-4"
                />
                <span className="text-[11px] text-muted-foreground/50 ml-1">
                  {sel.allSelected ? `${allVisibleIds.length} selected` : "Select all"}
                </span>
              </div>
            )}

            <div className="divide-y">
              {filteredSubfolders.map((sf) => (
                <div
                  key={sf.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {sel.selectionMode && (
                      <Checkbox
                        checked={sel.isSelected(sf.id)}
                        disabled={!canSelect(sf.id)}
                        onCheckedChange={() => sel.toggle(sf.id)}
                        className="size-4 shrink-0"
                      />
                    )}
                    <a
                      href={`/dashboard/folders/${sf.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                      onClick={(e) => { if (sel.selectionMode) e.preventDefault() }}
                    >
                      <FolderIcon className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm">{sf.name}</span>
                          {sf.is_locked && (
                            <LockIcon className="size-3 shrink-0 text-rose-500" />
                          )}
                          {sf.is_archived && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              Archived
                            </span>
                          )}
                          {sf.category_id && subfolderCategoryNames.has(sf.category_id) && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {subfolderCategoryNames.get(sf.category_id)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </a>
                  </div>
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
                    {(canArchive || canDelete) && !isLocked && !sel.selectionMode && (
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
                          {canMove && !isLocked && (
                            <MoveDialog
                              type="folder"
                              itemIds={[sf.id]}
                              currentParentId={folderId}
                              itemName={sf.name}
                              canMoveToRoot={userRole === "dean" || userRole === "program_head"}
                              nativeButton={false}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <MoveIcon className="size-3.5" />
                                  Move
                                </DropdownMenuItem>
                              }
                            />
                          )}
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
                              {(canMove || canArchive) && <DropdownMenuSeparator />}
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
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {sel.selectionMode && (
                        <Checkbox
                          checked={sel.isSelected(doc.id)}
                          disabled={!canSelect(doc.id)}
                          onCheckedChange={() => sel.toggle(doc.id)}
                          className="size-4 shrink-0"
                        />
                      )}
                      <a
                        href={`/dashboard/documents/${doc.id}`}
                        className="flex items-center gap-3 min-w-0 flex-1"
                        onClick={(e) => { if (sel.selectionMode) e.preventDefault() }}
                      >
                        {fileTypeIcon(doc.file_type)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm">{doc.title}</span>
                          {doc.is_archived && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              Archived
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {versionCounts.get(doc.id) ?? 1} version{(versionCounts.get(doc.id) ?? 1) !== 1 ? "s" : ""}
                          </Badge>
                          {doc.category_id && docCategoryNames.has(doc.category_id) && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {docCategoryNames.get(doc.category_id)}
                            </Badge>
                          )}
                          {TEXT_EXTRACTABLE_TYPES.includes(doc.file_type) && documentOcrStatus.get(doc.id) === "completed" && (
                            <OcrViewerButton
                              documentId={doc.id}
                              title={doc.title}
                              status="completed"
                            />
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
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(canEditDoc(doc.owner_id) && !isLocked) && !sel.selectionMode && (
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
                      {!isLocked && !sel.selectionMode && (
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
                          {canMove && !isLocked && (
                            <MoveDialog
                              type="document"
                              itemIds={[doc.id]}
                              currentParentId={folderId}
                              itemName={doc.title}
                              nativeButton={false}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <MoveIcon className="size-3.5" />
                                  Move
                                </DropdownMenuItem>
                              }
                            />
                          )}
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
                              {(canMove || canArchive) && <DropdownMenuSeparator />}
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

      {batchMoveOpen && (
        <MoveDialog
          type={subfolders.some((sf) => sel.selectedIds.has(sf.id)) ? "folder" : "document"}
          itemIds={getSelectedItems().map((i) => i.id)}
          itemName={`${sel.selectedCount} items`}
          open={batchMoveOpen}
          onOpenChange={(v) => { setBatchMoveOpen(v); if (!v) sel.exitSelectionMode() }}
        />
      )}

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

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LockIcon, UnlockIcon, UserPlusIcon, ArchiveIcon, ArchiveRestoreIcon, Trash2Icon, DownloadIcon, PencilIcon, MoveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MoveDialog } from "@/components/move-dialog"

interface FolderActionsProps {
  folderId: string
  folderName: string
  isLocked: boolean
  isArchived: boolean
  inheritPermissions: boolean
  hasParent: boolean
  parentId: string | null
  programId: string | null
  ownerName: string
  userRole: string
  canArchive: boolean
  canDelete: boolean
  canEdit: boolean
  canMove: boolean
  canToggleInherit: boolean
}

export function FolderActions({
  folderId,
  folderName,
  isLocked: initialLocked,
  isArchived: initialArchived,
  inheritPermissions: initialInherit,
  hasParent,
  parentId,
  programId,
  ownerName,
  userRole,
  canArchive,
  canDelete,
  canEdit,
  canMove,
  canToggleInherit,
}: FolderActionsProps) {
  const [isLocked, setIsLocked] = useState(initialLocked)
  const [isArchived, setIsArchived] = useState(initialArchived)
  const [inherit, setInherit] = useState(initialInherit)
  const [loading, setLoading] = useState(false)
  const [transferEmail, setTransferEmail] = useState("")
  const [transferLoding, setTransferLoding] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(folderName)
  const [renaming, setRenaming] = useState(false)
  const router = useRouter()

  const canLock = userRole === "dean" || userRole === "program_head"
  const canTransfer = canLock
  const isProgramRoot = parentId === null && programId !== null

  const handleLock = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lock: !isLocked }),
      })
      if (res.ok) {
        setIsLocked(!isLocked)
        router.refresh()
        toast.success(isLocked ? "Folder unlocked" : "Folder locked")
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleInherit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inheritPermissions: !inherit }),
      })
      if (res.ok) {
        setInherit(!inherit)
        toast.success(inherit ? "Inheritance disabled" : "Inheritance enabled")
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/folders/${folderId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: !isArchived }),
      })
      if (res.ok) {
        setIsArchived(!isArchived)
        router.refresh()
        toast.success(isArchived ? "Folder unarchived" : "Folder archived")
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Folder moved to Recycle Bin")
        router.refresh()
        router.back()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferEmail.trim()) return
    setTransferLoding(true)
    try {
      const usersRes = await fetch("/api/users")
      const usersData = await usersRes.json()
      const targetUser = usersData.users?.find(
        (u: { email: string; id: string }) => u.email === transferEmail.trim(),
      )
      if (!targetUser) {
        toast.error("User not found")
        return
      }

      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferOwnerTo: targetUser.id }),
      })
      if (res.ok) {
        toast.success(`Ownership transferred to ${targetUser.full_name}`)
        router.refresh()
        setTransferOpen(false)
        setTransferEmail("")
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setTransferLoding(false)
    }
  }

  const handleRename = async () => {
    if (!renameValue.trim()) {
      toast.error("Folder name is required")
      return
    }
    if (renameValue.trim() === folderName) {
      setRenameOpen(false)
      return
    }
    setRenaming(true)
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed")
      }
      toast.success("Folder renamed")
      setRenameOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canLock && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleLock}
          disabled={loading}
          className="gap-1.5"
        >
          {isLocked ? (
            <>
              <UnlockIcon className="size-3.5" />
              Unlock
            </>
          ) : (
            <>
              <LockIcon className="size-3.5" />
              Lock
            </>
          )}
        </Button>
      )}

      {canEdit && (
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5" disabled={isLocked}>
                <PencilIcon className="size-3.5" />
                Rename
              </Button>
            }
          />
          <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename &ldquo;{folderName}&rdquo;</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleRename()
            }}
          >
            <fieldset disabled={renaming} className="flex flex-col gap-4">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Folder name"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRenameOpen(false)
                    setRenameValue(folderName)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={renaming}>
                  {renaming ? "Renaming..." : "Rename"}
                </Button>
              </div>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {canMove && !isProgramRoot && (
        <MoveDialog
          type="folder"
          itemIds={[folderId]}
          currentParentId={parentId}
          itemName={folderName}
          disabled={isLocked}
          canMoveToRoot={userRole === "dean" || userRole === "program_head"}
          trigger={
            <Button variant="outline" size="sm" disabled={isLocked} className="gap-1.5">
              <MoveIcon className="size-3.5" />
              Move
            </Button>
          }
        />
      )}

      {canTransfer && (
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5" disabled={isLocked}>
                <UserPlusIcon className="size-3.5" />
                Transfer
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer ownership of &ldquo;{folderName}&rdquo;</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Current owner: {ownerName}
              </p>
              <div className="flex flex-col gap-2">
                <Label
                  className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  New owner email
                </Label>
                <Input
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="e.g. user@example.com"
                />
              </div>
              <Button
                onClick={handleTransfer}
                disabled={transferLoding || !transferEmail.trim()}
              >
                {transferLoding ? "Transferring..." : "Transfer Ownership"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {canToggleInherit && (
        <div className="flex items-center gap-2 ml-2 pl-2 border-l">
          <Switch
            checked={inherit}
            onCheckedChange={handleInherit}
            disabled={loading}
          />
          <Label
            className="text-xs cursor-pointer"
            onClick={handleInherit}
          >
            Inherit permissions
          </Label>
        </div>
      )}

      {isLocked && (
        <span
          className="px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] bg-destructive/15 text-destructive font-medium"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Locked
        </span>
      )}

      {isArchived && (
        <span
          className="px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Archived
        </span>
      )}

      <a
        href={`/api/folders/${folderId}/download`}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <DownloadIcon className="size-3.5" /> ZIP
      </a>
      {canArchive && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleArchive}
          disabled={loading || isLocked}
          className="gap-1.5"
        >
          {isArchived ? (
            <>
              <ArchiveRestoreIcon className="size-3.5" />
              Unarchive
            </>
          ) : (
            <>
              <ArchiveIcon className="size-3.5" />
              Archive
            </>
          )}
        </Button>
      )}

      {canDelete && (
        <ConfirmDialog
          title="Move to Recycle Bin?"
          description={`Move "${folderName}" to the Recycle Bin? It will be permanently deleted after 30 days.`}
          confirmLabel="Move to Bin"
          destructive
          onConfirm={handleDelete}
          loading={loading}
          trigger={
            <Button
              variant="outline"
              size="sm"
              disabled={loading || isLocked}
              className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2Icon className="size-3.5" />
              Delete
            </Button>
          }
        />
      )}
    </div>
  )
}

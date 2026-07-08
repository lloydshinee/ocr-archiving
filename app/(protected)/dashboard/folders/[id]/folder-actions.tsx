"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { LockIcon, UnlockIcon, UserPlusIcon, ArchiveIcon, ArchiveRestoreIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface FolderActionsProps {
  folderId: string
  folderName: string
  isLocked: boolean
  isArchived: boolean
  inheritPermissions: boolean
  ownerName: string
  userRole: string
  canArchive: boolean
  canDelete: boolean
}

export function FolderActions({
  folderId,
  folderName,
  isLocked: initialLocked,
  isArchived: initialArchived,
  inheritPermissions: initialInherit,
  ownerName,
  userRole,
  canArchive,
  canDelete,
}: FolderActionsProps) {
  const [isLocked, setIsLocked] = useState(initialLocked)
  const [isArchived, setIsArchived] = useState(initialArchived)
  const [inherit, setInherit] = useState(initialInherit)
  const [loading, setLoading] = useState(false)
  const [transferEmail, setTransferEmail] = useState("")
  const [transferLoding, setTransferLoding] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const canLock = userRole === "dean" || userRole === "program_head"
  const canTransfer = canLock
  const canToggleInherit = userRole === "dean"

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
    if (!confirm(`Move "${folderName}" to the Recycle Bin?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Folder moved to Recycle Bin")
        window.location.href = "/dashboard"
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

  return (
    <div className="flex items-center gap-3">
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

      {canTransfer && (
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5">
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
          className="px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] bg-destructive/10 text-destructive"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Locked
        </span>
      )}

      {isArchived && (
        <span
          className="px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Archived
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {canArchive && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={loading}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2Icon className="size-3.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

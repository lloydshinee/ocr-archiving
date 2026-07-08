"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL_ACTIONS = ["view", "create", "edit", "move", "delete", "archive"] as const
type PermAction = (typeof ALL_ACTIONS)[number]

interface UserOption {
  id: string
  full_name: string
  role: string
}

interface FolderOption {
  id: string
  name: string
}

interface PermissionEntry {
  id: string
  userId: string
  userFullName: string
  actions: string[]
  assignedBy: string
  assignedByName: string
  assignedDate: string
}

export function PermissionManager({ role }: { role: string; userId: string }) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedFolder, setSelectedFolder] = useState<string>("")
  const [selectedActions, setSelectedActions] = useState<Set<PermAction>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folderPermissions, setFolderPermissions] = useState<PermissionEntry[]>([])

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, foldersRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/folders"),
        ])

        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(data.users ?? [])
        }
        if (foldersRes.ok) {
          const data = await foldersRes.json()
          setFolders(data.folders ?? [])
        }
      } catch {
        setError("Failed to load data")
      }
    }
    load()
  }, [])

  const fetchPermissions = useCallback(async (folderId: string) => {
    if (!folderId) {
      setFolderPermissions([])
      return
    }
    try {
      const res = await fetch(`/api/folders/${folderId}/permissions`)
      if (res.ok) {
        const data = await res.json()
        setFolderPermissions(data.permissions ?? [])
      }
    } catch {
      toast.error("Failed to load permissions")
    }
  }, [])

  useEffect(() => {
    fetchPermissions(selectedFolder)
  }, [selectedFolder, fetchPermissions])

  const toggleAction = (action: PermAction) => {
    setSelectedActions((prev) => {
      const next = new Set(prev)
      if (next.has(action)) {
        next.delete(action)
      } else {
        next.add(action)
      }
      return next
    })
  }

  const handleGrant = async () => {
    if (!selectedUser || !selectedFolder || selectedActions.size === 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          folderId: selectedFolder,
          actions: Array.from(selectedActions),
        }),
      })
      if (res.ok) {
        toast.success("Permission granted")
        setSelectedActions(new Set())
        fetchPermissions(selectedFolder)
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to grant")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (permId: string) => {
    try {
      const res = await fetch(`/api/permissions/${permId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Permission revoked")
        fetchPermissions(selectedFolder)
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to revoke")
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  const handleModify = async (permId: string, action: PermAction, add: boolean) => {
    try {
      const res = await fetch(`/api/permissions/${permId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: [action], assign: add }),
      })
      if (res.ok) {
        toast.success(add ? "Action added" : "Action removed")
        fetchPermissions(selectedFolder)
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Permission Management
        </h1>
        <p
          className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Grant, modify, and revoke folder permissions
        </p>
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg border p-6">
          <h2 className="text-sm font-semibold">Grant Permission</h2>

          <div className="flex flex-col gap-2">
            <Label
              className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              User
            </Label>
            <Select value={selectedUser} onValueChange={(v) => setSelectedUser(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Folder
            </Label>
            <Select value={selectedFolder} onValueChange={(v) => setSelectedFolder(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a folder..." />
              </SelectTrigger>
              <SelectContent>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Actions
            </Label>
            <div className="flex flex-wrap gap-3">
              {ALL_ACTIONS.map((action) => (
                <div key={action} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id={`action-${action}`}
                    checked={selectedActions.has(action)}
                    onChange={() => toggleAction(action)}
                    className="size-4 rounded border-border accent-primary"
                  />
                  <Label
                    htmlFor={`action-${action}`}
                    className="text-sm capitalize cursor-pointer"
                  >
                    {action}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGrant}
            disabled={loading || !selectedUser || !selectedFolder || selectedActions.size === 0}
            className="w-full"
          >
            {loading ? "Granting..." : "Grant Permission"}
          </Button>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border p-6">
          <h2 className="text-sm font-semibold">
            {selectedFolder ? "Folder Permissions" : "Select a folder to view permissions"}
          </h2>

          {folderPermissions.length === 0 ? (
            selectedFolder ? (
              <p className="text-sm text-muted-foreground">No permissions assigned to this folder.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Choose a folder from the grant panel.</p>
            )
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Assigned by</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folderPermissions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.userFullName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ALL_ACTIONS.map((action) => {
                            const has = p.actions.includes(action)
                            return (
                              <button
                                key={action}
                                onClick={() => handleModify(p.id, action, !has)}
                                className={`rounded px-1.5 py-0.5 text-[11px] capitalize transition-colors ${
                                  has
                                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {action}
                              </button>
                            )
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.assignedByName}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleRevoke(p.id)}
                        >
                          <Trash2Icon className="size-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

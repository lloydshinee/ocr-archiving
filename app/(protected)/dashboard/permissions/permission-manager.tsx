"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Trash2Icon, FolderPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
import { Skeleton } from "@/components/ui/skeleton"

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

export function PermissionManager() {
  const [users, setUsers] = useState<UserOption[]>([])
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedFolder, setSelectedFolder] = useState<string>("")
  const [selectedActions, setSelectedActions] = useState<Set<PermAction>>(new Set())
  const [granting, setGranting] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [folderPermissions, setFolderPermissions] = useState<PermissionEntry[]>([])
  const [permsLoading, setPermsLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setDataLoading(true)
        const [usersRes, foldersRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/folders"),
        ])

        if (!usersRes.ok) throw new Error("Failed to load users")
        if (!foldersRes.ok) throw new Error("Failed to load folders")

        const usersData = await usersRes.json()
        const foldersData = await foldersRes.json()

        setUsers(usersData.users ?? [])
        setFolders(foldersData.folders ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setDataLoading(false)
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
      setPermsLoading(true)
      const res = await fetch(`/api/folders/${folderId}/permissions`)
      if (res.ok) {
        const data = await res.json()
        setFolderPermissions(data.permissions ?? [])
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to load permissions")
      }
    } catch {
      toast.error("Failed to load permissions")
    } finally {
      setPermsLoading(false)
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
    setGranting(true)
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
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed")
      }
      toast.success("Permission granted")
      setSelectedActions(new Set())
      setSelectedUser("")
      fetchPermissions(selectedFolder)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGranting(false)
    }
  }

  const handleRevoke = async (permId: string) => {
    try {
      const res = await fetch(`/api/permissions/${permId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed")
      }
      toast.success("Permission revoked")
      fetchPermissions(selectedFolder)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const handleModify = async (permId: string, action: PermAction, add: boolean) => {
    try {
      const res = await fetch(`/api/permissions/${permId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: [action], assign: add }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed")
      }
      toast.success(add ? "Action added" : "Action removed")
      fetchPermissions(selectedFolder)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const allActionsSelected = ALL_ACTIONS.every((a) => selectedActions.has(a))
  const someActionsSelected = ALL_ACTIONS.some((a) => selectedActions.has(a))

  const toggleAllActions = () => {
    if (allActionsSelected) {
      setSelectedActions(new Set())
    } else {
      setSelectedActions(new Set(ALL_ACTIONS))
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

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg border p-6">
          <h2 className="text-sm font-semibold">Grant Permission</h2>

          {dataLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <FolderPlusIcon className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No folders exist yet. Create a folder first from the sidebar to manage its permissions.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label
                  className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  User
                </Label>
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No users available.</p>
                ) : (
                  <Select value={selectedUser} onValueChange={(v) => setSelectedUser(v ?? "")}>
                    <SelectTrigger>
                      {selectedUser
                        ? users.find((u) => u.id === selectedUser)?.full_name ?? "Select a user..."
                        : "Select a user..."}
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} <span className="text-muted-foreground">({u.role})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                    {selectedFolder
                      ? folders.find((f) => f.id === selectedFolder)?.name ?? "Select a folder..."
                      : "Select a folder..."}
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
                <div className="flex items-center justify-between">
                  <Label
                    className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Actions
                  </Label>
                  <button
                    type="button"
                    onClick={toggleAllActions}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {allActionsSelected ? "Clear all" : "Select all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_ACTIONS.map((action) => (
                    <label
                      key={action}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm capitalize transition-colors ${
                        selectedActions.has(action)
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedActions.has(action)}
                        onChange={() => toggleAction(action)}
                        className="sr-only"
                      />
                      {action}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGrant}
                disabled={granting || !selectedUser || !selectedFolder || selectedActions.size === 0}
              >
                {granting ? "Granting..." : "Grant Permission"}
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-lg border p-6">
          <h2 className="text-sm font-semibold">
            {selectedFolder ? "Folder Permissions" : "Permissions"}
          </h2>

          {!selectedFolder ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Select a folder to view and manage its permissions.
              </p>
            </div>
          ) : permsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : folderPermissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No permissions assigned to this folder yet.
              </p>
              <p
                className="text-[11px] text-muted-foreground/50"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Use the grant panel to assign permissions.
              </p>
            </div>
          ) : (
            <div className="-mx-6 -mb-6 overflow-auto">
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
                                type="button"
                                className={`rounded px-2 py-0.5 text-[11px] capitalize transition-colors ${
                                  has
                                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
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
                          className="size-8"
                          onClick={() => handleRevoke(p.id)}
                          title="Revoke all"
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

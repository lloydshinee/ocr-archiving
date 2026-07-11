"use client"

import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"
import { Trash2Icon, Loader2Icon, UsersIcon, GraduationCapIcon, UserCogIcon, UserCheckIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/browser"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const ALL_ACTIONS = ["view", "create", "edit", "move", "delete", "archive"] as const
type PermAction = (typeof ALL_ACTIONS)[number]

const ROLE_PRESETS: Record<string, PermAction[]> = {
  faculty: ["view"],
  student_assistant: ["view", "create", "edit"],
  program_head: [...ALL_ACTIONS],
  dean: [...ALL_ACTIONS],
}

interface UserOption {
  id: string
  full_name: string
  role: string
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

interface FolderPermissionsPanelProps {
  folderId: string
  canManage: boolean
}

export function FolderPermissionsPanel({
  folderId,
  canManage,
}: FolderPermissionsPanelProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [permissions, setPermissions] = useState<PermissionEntry[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedActions, setSelectedActions] = useState<Set<PermAction>>(new Set())
  const [granting, setGranting] = useState(false)
  const [bulkProcessingRole, setBulkProcessingRole] = useState<string | null>(null)
  const [bulkActions, setBulkActions] = useState<Record<string, PermAction[]>>({})
  const [usersLoading, setUsersLoading] = useState(true)
  const [permsLoading, setPermsLoading] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>("faculty")

  const userCountByRole = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const u of users) {
      counts[u.role] = (counts[u.role] ?? 0) + 1
    }
    return counts
  }, [users])

  const grantedCountByRole = useMemo(() => {
    const counts: Record<string, number> = {}
    const userIds = new Set(permissions.map((p) => p.userId))
    for (const u of users) {
      if (userIds.has(u.id)) {
        counts[u.role] = (counts[u.role] ?? 0) + 1
      }
    }
    return counts
  }, [users, permissions])

  const bulkTargetRoles = useMemo(() => {
    const roles: { value: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
      { value: "faculty", label: "Faculty", Icon: GraduationCapIcon },
      { value: "student_assistant", label: "Student Assistants", Icon: UserCheckIcon },
    ]
    if (currentUserRole === "dean") {
      roles.push({ value: "program_head", label: "Program Heads", Icon: UserCogIcon })
    }
    return roles
  }, [currentUserRole])

  // Sync bulk actions with what's already granted per role
  useEffect(() => {
    const grantedByRole: Record<string, PermAction[]> = {}
    for (const { value } of bulkTargetRoles) {
      const roleUserIds = new Set(
        users.filter((u) => u.role === value).map((u) => u.id),
      )
      const actions = new Set<PermAction>()
      for (const perm of permissions) {
        if (roleUserIds.has(perm.userId)) {
          for (const a of perm.actions) {
            actions.add(a as PermAction)
          }
        }
      }
      grantedByRole[value] = [...actions]
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBulkActions(grantedByRole)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, bulkTargetRoles])

  async function loadPermissions() {
    try {
      setPermsLoading(true)
      const res = await fetch(`/api/folders/${folderId}/permissions`)
      if (res.ok) {
        const data = await res.json()
        setPermissions(data.permissions ?? [])
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to load permissions")
      }
    } catch {
      toast.error("Failed to load permissions")
    } finally {
      setPermsLoading(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setUsersLoading(true)
        setPermsLoading(true)

        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()

        const [usersRes, permsRes] = await Promise.all([
          fetch("/api/users"),
          canManage ? fetch(`/api/folders/${folderId}/permissions`) : null,
        ])

        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(data.users ?? [])

          const me = data.users?.find(
            (u: UserOption) => u.id === sessionData?.session?.user?.id,
          )
          if (me) {
            setCurrentUserRole(me.role)
          }
        }

        if (permsRes?.ok) {
          const data = await permsRes.json()
          setPermissions(data.permissions ?? [])
        } else if (permsRes) {
          const data = await permsRes.json()
          toast.error(data.error ?? "Failed to load permissions")
        }
      } catch {
        toast.error("Failed to load data")
      } finally {
        setUsersLoading(false)
        setPermsLoading(false)
      }
    }
    load()
  }, [folderId, canManage])

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    if (!userId) {
      setSelectedActions(new Set())
      return
    }
    const user = users.find((u) => u.id === userId)
    if (user) {
      const preset = ROLE_PRESETS[user.role]
      if (preset) setSelectedActions(new Set(preset))
    }
  }

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
    if (!selectedUserId || selectedActions.size === 0) return
    setGranting(true)
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          folderId,
          actions: Array.from(selectedActions),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed")
      }
      toast.success("Permission granted")
      setSelectedUserId("")
      setSelectedActions(new Set())
      loadPermissions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGranting(false)
    }
  }

  const handleBulkGrant = async (role: string) => {
    const actions = bulkActions[role]
    if (!actions || actions.length === 0) {
      toast.error("Select at least one action")
      return
    }
    setBulkProcessingRole(role)
    try {
      const res = await fetch("/api/permissions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, role, actions }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed")
      }
      const data = await res.json()
      toast.success(`Granted to ${data.granted} user${data.granted === 1 ? "" : "s"}`)
      loadPermissions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBulkProcessingRole(null)
    }
  }

  const handleBulkRevoke = async (role: string) => {
    setBulkProcessingRole(role)
    try {
      const res = await fetch("/api/permissions/bulk/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, role }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed")
      }
      const data = await res.json()
      if (data.revoked > 0) {
        toast.success(`Revoked from ${data.revoked} user${data.revoked === 1 ? "" : "s"}`)
      } else {
        toast("No permissions to revoke")
      }
      loadPermissions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBulkProcessingRole(null)
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
      loadPermissions()
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
      loadPermissions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  if (!canManage) return null

  return (
    <div className="rounded-lg border">
      <div className="p-4">
        <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Grant permission
              </h3>

              <div className="flex flex-col gap-2">
                <Label
                  className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  User
                </Label>
                {usersLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedUserId} onValueChange={(v) => handleSelectUser(v ?? "")}>
                    <SelectTrigger>
                      {selectedUserId
                        ? users.find((u) => u.id === selectedUserId)?.full_name ?? "Select a user..."
                        : "Select a user..."}
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name}{" "}
                          <span className="text-muted-foreground">({u.role})</span>
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
                  Actions
                </Label>
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
                disabled={granting || !selectedUserId || selectedActions.size === 0}
                size="sm"
              >
                {granting ? "Granting..." : "Grant Permission"}
              </Button>

              <div className="border-t pt-4 mt-2">
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3 flex items-center gap-1.5">
                  <UsersIcon className="size-3.5" />
                  Bulk operations
                </h4>

                {currentUserRole !== "student_assistant" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bulkTargetRoles.map(({ value, label, Icon }) => {
                      const count = userCountByRole[value] ?? 0
                      const isLoading = bulkProcessingRole === value

                      return (
                        <div
                          key={value}
                          className="relative rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                                <Icon className="size-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium capitalize leading-none mb-0.5">
                                  {label}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {count} {count === 1 ? "user" : "users"}
                                  {grantedCountByRole[value] > 0 && (
                                    <span>
                                      {" "}&middot;{" "}
                                      {grantedCountByRole[value]} already have access
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {ALL_ACTIONS.map((action) => {
                              const selected = bulkActions[value]?.includes(action)
                              return (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() =>
                                    setBulkActions((prev) => {
                                      const current = prev[value] ?? []
                                      const next = selected
                                        ? current.filter((a) => a !== action)
                                        : [...current, action]
                                      return { ...prev, [value]: next }
                                    })
                                  }
                                  className={`rounded px-2 py-0.5 text-[11px] capitalize transition-colors ${
                                    selected
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {action}
                                </button>
                              )
                            })}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleBulkGrant(value)}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              {isLoading ? (
                                <Loader2Icon className="size-3.5 animate-spin mr-1" />
                              ) : null}
                              Grant
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger
                                className="flex-1 inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                                disabled={isLoading}
                              >
                                Revoke all
                              </AlertDialogTrigger>
                              <AlertDialogContent size="sm">
                                <AlertDialogHeader>
                                  <AlertDialogMedia>
                                    <Trash2Icon className="size-5 text-destructive" />
                                  </AlertDialogMedia>
                                  <AlertDialogTitle>
                                    Revoke all {label} permissions?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove every permission entry for{" "}
                                    {label.toLowerCase()} on this folder. They will lose all
                                    access unless they have access through other means.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    variant="destructive"
                                    onClick={() => handleBulkRevoke(value)}
                                  >
                                    Revoke all
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <p
                    className="mt-3 text-[11px] text-muted-foreground/60 leading-relaxed"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Granting applies to current users only. New users added later
                    won&apos;t automatically receive access.
                  </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Current permissions
              </h3>

              {permsLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No permissions assigned yet.
                </p>
              ) : (
                <div className="-mx-4 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead className="hidden sm:table-cell">By</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-sm">
                            {p.userFullName}
                          </TableCell>
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
                          <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
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
    </div>
  )
}
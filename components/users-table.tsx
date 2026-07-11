"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateUserDialog } from "@/components/create-user-dialog"
import { EditUserDialog } from "@/components/edit-user-dialog"
import { type UserRole } from "@/lib/user-utils"
import { Loader2Icon, PlusIcon, PencilIcon, UserXIcon, UserCheckIcon, UsersIcon } from "lucide-react"

interface UserData {
  id: string
  email: string
  full_name: string
  role: UserRole
  program_id: string | null
  is_deactivated: boolean
  deactivated_at: string | null
  created_at: string
  created_by: string | null
  last_sign_in_at: string | null
}

interface Program {
  id: string
  name: string
}

interface UsersTableProps {
  currentUserId: string
  currentUserRole: UserRole
  currentUserProgramId: string | null
  programs: Program[]
}

const ROLE_LABELS: Record<UserRole, string> = {
  dean: "Dean",
  program_head: "Program Head",
  faculty: "Faculty",
  student_assistant: "Student Assistant",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  const d = new Date(dateStr)
  return (
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  )
}

export function UsersTable({
  currentUserId,
  currentUserRole,
  currentUserProgramId,
  programs,
}: UsersTableProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)

  const programMap = new Map(programs.map((p) => [p.id, p.name]))

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? "Failed to load users.")
        setLoading(false)
        return
      }
      setUsers(data.users)
      setLoading(false)
    } catch {
      setError("Could not reach the server.")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers()
  }, [loadUsers])

  async function toggleDeactivation(user: UserData) {
    setTogglingId(user.id)
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? "Action failed.")
        return
      }
      await loadUsers()
    } catch {
      setError("Could not reach the server.")
    } finally {
      setTogglingId(null)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null)
            setLoading(true)
            loadUsers()
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {["Name", "Email", "Role", "Program", "Status", "Created", "Last Login", ""].map(
                  (h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {users.length} {users.length === 1 ? "user" : "users"}
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add user
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <UsersIcon className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {u.program_id && programMap.has(u.program_id)
                        ? programMap.get(u.program_id)
                        : "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.is_deactivated ? "outline" : "default"}
                      className="text-xs"
                    >
                      {u.is_deactivated ? "Deactivated" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {formatDate(u.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {formatDateTime(u.last_sign_in_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {currentUserRole === "dean" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditingUser(u)
                              setEditDialogOpen(true)
                            }}
                            aria-label="Edit user"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          {u.id !== currentUserId && (
                            <Button
                              variant={u.is_deactivated ? "outline" : "secondary"}
                              size="icon-sm"
                              disabled={togglingId === u.id}
                              onClick={() => toggleDeactivation(u)}
                              aria-label={
                                u.is_deactivated
                                  ? "Reactivate user"
                                  : "Deactivate user"
                              }
                            >
                              {togglingId === u.id ? (
                                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                              ) : u.is_deactivated ? (
                                <UserCheckIcon className="h-3.5 w-3.5" />
                              ) : (
                                <UserXIcon className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </>
                      )}
                      {currentUserRole !== "dean" && (
                        <span
                          className="text-[10px] text-muted-foreground/50"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {u.is_deactivated ? "Deactivated" : "Active"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creatorRole={currentUserRole}
        creatorProgramId={currentUserProgramId}
        programs={programs}
        onCreated={loadUsers}
      />

      {editingUser && (
        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={(o) => {
            setEditDialogOpen(o)
            if (!o) setEditingUser(null)
          }}
          user={editingUser}
          programs={programs}
          onUpdated={loadUsers}
        />
      )}
    </>
  )
}

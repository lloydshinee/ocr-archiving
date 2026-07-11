"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type UserRole } from "@/lib/user-utils"

interface Program {
  id: string
  name: string
}

interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  program_id: string | null
}

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  programs: Program[]
  onUpdated: () => void
}

const ALL_ROLES: UserRole[] = [
  "dean",
  "program_head",
  "faculty",
  "student_assistant",
]

const ROLE_LABELS: Record<UserRole, string> = {
  dean: "Dean",
  program_head: "Program Head",
  faculty: "Faculty",
  student_assistant: "Student Assistant",
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  programs,
  onUpdated,
}: EditUserDialogProps) {
  const [fullName, setFullName] = useState(user.full_name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<UserRole>(user.role)
  const [programId, setProgramId] = useState<string>(user.program_id ?? "")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setFullName(user.full_name)
    setEmail(user.email)
    setRole(user.role)
    setProgramId(user.program_id ?? "")
    setPassword("")
    setError(null)
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password && password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)

    const body: Record<string, unknown> = {
      fullName,
      email,
      role,
      programId: programId || null,
    }

    if (password) {
      body.password = password
    }

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? "Failed to update user.")
      setLoading(false)
      return
    }

    onOpenChange(false)
    onUpdated()
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) reset()
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update details for {user.full_name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-fullName">Full name</FieldLabel>
                <Input
                  id="edit-fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-email">Email</FieldLabel>
                <Input
                  id="edit-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-role">Role</FieldLabel>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    setRole(v as UserRole)
                    if (v !== "program_head") {
                      setProgramId("")
                    }
                  }}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {role === "program_head" && (
                <Field>
                  <FieldLabel htmlFor="edit-program">Program</FieldLabel>
                  <Select
                    value={programId || undefined}
                    onValueChange={(v) => setProgramId(v ?? "")}
                  >
                    <SelectTrigger id="edit-program">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="edit-password">
                  New password{" "}
                  <span className="font-normal text-muted-foreground">
                    (leave blank to keep current)
                  </span>
                </FieldLabel>
                <Input
                  id="edit-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && (
                <p
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </FieldGroup>
          </fieldset>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

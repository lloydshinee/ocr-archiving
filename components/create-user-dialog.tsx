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
import { canCreateRole, type UserRole } from "@/lib/user-utils"

interface Program {
  id: string
  name: string
}

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creatorRole: UserRole
  creatorProgramId?: string | null
  programs: Program[]
  onCreated: () => void
}

export function CreateUserDialog({
  open,
  onOpenChange,
  creatorRole,
  programs,
  onCreated,
}: CreateUserDialogProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<UserRole | "">("")
  const [programId, setProgramId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const allowedRoles: UserRole[] = (
    ["dean", "program_head", "faculty", "student_assistant"] as UserRole[]
  ).filter((r) => canCreateRole(creatorRole, r))

  const isProgramHead = creatorRole === "program_head"

  function reset() {
    setEmail("")
    setPassword("")
    setFullName("")
    setRole("")
    setProgramId("")
    setError(null)
    setLoading(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (!role) {
      setError("Please select a role.")
      return
    }

    setLoading(true)

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        fullName,
        role,
        programId: programId || null,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? "Failed to create user.")
      setLoading(false)
      return
    }

    reset()
    onOpenChange(false)
    onCreated()
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) reset()
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Add a new account to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="create-fullName">Full name</FieldLabel>
                <Input
                  id="create-fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-email">Email</FieldLabel>
                <Input
                  id="create-email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@ccs.edu"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-password">Password</FieldLabel>
                <Input
                  id="create-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="create-role">Role</FieldLabel>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    setRole(v as UserRole)
                    if (v === "dean" || (isProgramHead)) {
                      setProgramId("")
                    }
                  }}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r === "program_head"
                          ? "Program Head"
                          : r === "student_assistant"
                            ? "Student Assistant"
                            : r.charAt(0).toUpperCase() + r.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="create-program">Program</FieldLabel>
                <Select
                  value={programId || undefined}
                  onValueChange={(v) => setProgramId(v ?? "")}
                  disabled={isProgramHead || role === "dean"}
                >
                  <SelectTrigger id="create-program">
                    <SelectValue
                      placeholder={
                        isProgramHead
                          ? "Your program (auto-set)"
                          : role === "dean"
                            ? "Optional for Dean"
                            : "Select a program"
                      }
                    />
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
              {loading ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

interface Item {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface ClassificationSectionProps {
  apiBase: string
  itemLabel: string
  itemLabelPlural: string
  emptyIcon: LucideIcon
  emptyText: string
  emptyDescription: string
  createDescription: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  })
}

export function ClassificationSection({
  apiBase,
  itemLabel,
  itemLabelPlural,
  emptyIcon: EmptyIcon,
  emptyText,
  emptyDescription,
  createDescription,
}: ClassificationSectionProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState<Item | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(apiBase)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? "Failed to load.")
          setLoading(false)
          return
        }
        setItems(data.items ?? data.categories ?? data.documentTypes ?? [])
        setLoading(false)
      } catch {
        setError("Could not reach the server.")
        setLoading(false)
      }
    }
    load()
  }, [apiBase])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-destructive" role="alert">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { setError(null); setLoading(true); window.location.reload() }}>
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
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {["Name", "Description", "Created", "Updated", ""].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
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
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
          {items.length} {items.length === 1 ? itemLabel : itemLabelPlural}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add {itemLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <EmptyIcon className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{emptyText}</p>
          <p className="text-xs text-muted-foreground/60">{emptyDescription}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.description || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      {formatDate(item.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      {formatDate(item.updated_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`}>
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(item)} aria-label={`Delete ${item.name}`}>
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        apiBase={apiBase}
        itemLabel={itemLabel}
        createDescription={createDescription}
        onDone={() => { setItems([]); setLoading(true); setError(null); }}
      />

      {editing && (
        <EditDialog
          open
          onOpenChange={(open) => { if (!open) setEditing(null) }}
          apiBase={apiBase}
          item={editing}
          itemLabel={itemLabel}
          onDone={() => { setItems([]); setLoading(true); setError(null); }}
        />
      )}

      {deleting && (
        <DeleteDialog
          open
          onOpenChange={(open) => { if (!open) setDeleting(null) }}
          apiBase={apiBase}
          item={deleting}
          itemLabel={itemLabel}
          onDone={() => { setItems([]); setLoading(true); setError(null); }}
        />
      )}
    </>
  )
}

function CreateDialog({
  open, onOpenChange, apiBase, itemLabel, createDescription, onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiBase: string
  itemLabel: string
  createDescription: string
  onDone: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setName(""); setDescription(""); setError(null); setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError(`${itemLabel} name is required.`); return }
    setLoading(true)
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed."); setLoading(false); return }
    reset(); onOpenChange(false); onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {itemLabel}</DialogTitle>
          <DialogDescription>{createDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`create-${apiBase}-name`}>Name</FieldLabel>
                <Input id={`create-${apiBase}-name`} type="text" placeholder={`e.g. ${itemLabel}`} required value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`create-${apiBase}-desc`}>Description</FieldLabel>
                <Textarea id={`create-${apiBase}-desc`} placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </Field>
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
            </FieldGroup>
          </fieldset>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : `Create ${itemLabel}`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditDialog({
  open, onOpenChange, apiBase, item, itemLabel, onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiBase: string
  item: Item
  itemLabel: string
  onDone: () => void
}) {
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description ?? "")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() { setName(item.name); setDescription(item.description ?? ""); setError(null); setLoading(false) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError(`${itemLabel} name is required.`); return }
    setLoading(true)
    const res = await fetch(`${apiBase}/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed."); setLoading(false); return }
    onOpenChange(false); onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {itemLabel}</DialogTitle>
          <DialogDescription>Update the name or description.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`edit-${apiBase}-name`}>Name</FieldLabel>
                <Input id={`edit-${apiBase}-name`} type="text" required value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`edit-${apiBase}-desc`}>Description</FieldLabel>
                <Textarea id={`edit-${apiBase}-desc`} placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </Field>
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
            </FieldGroup>
          </fieldset>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  open, onOpenChange, apiBase, item, itemLabel, onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiBase: string
  item: { id: string; name: string }
  itemLabel: string
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setError(null); setLoading(true)
    const res = await fetch(`${apiBase}/${item.id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed."); setLoading(false); return }
    onOpenChange(false); onDone()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{item.name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={handleDelete}>
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

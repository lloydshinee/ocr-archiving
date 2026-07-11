"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function CreateSubfolderDialog({
  parentId,
  parentName,
  disabled,
}: {
  parentId: string
  parentName: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Folder name is required")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parentId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to create folder")
        return
      }

      toast.success("Folder created")
      setOpen(false)
      setName("")
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" type="button" disabled={disabled}>
            <PlusIcon className="size-4" /> New folder
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create subfolder</DialogTitle>
        </DialogHeader>
        <p
          className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          in {parentName}
        </p>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="subfolder-name"
                className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Folder name
              </Label>
              <Input
                id="subfolder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Accreditation"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  )
}

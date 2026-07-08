"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { SearchIcon, ChevronsUpDownIcon, FolderIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FolderOption {
  id: string
  name: string
  parentPath: string
}

interface FolderComboboxProps {
  folders: FolderOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export function FolderCombobox({
  folders,
  value,
  onChange,
  placeholder = "Search folders...",
}: FolderComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => folders.find((f) => f.id === value),
    [folders, value],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return folders
    const q = query.toLowerCase()
    return folders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.parentPath.toLowerCase().includes(q),
    )
  }, [folders, query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {selected ? (
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <span className="truncate text-sm">{selected.name}</span>
            {selected.parentPath && (
              <span className="truncate text-[10px] text-muted-foreground/60">
                {selected.parentPath}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground/50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="flex items-center border-b px-3">
            <SearchIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter..."
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="max-h-60 overflow-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No folders found
              </p>
            ) : (
              filtered.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    onChange(folder.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-left text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    value === folder.id && "bg-accent/50",
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {folder.parentPath && (
                    <span className="ml-5.5 block truncate text-[10px] text-muted-foreground/60">
                      {folder.parentPath}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

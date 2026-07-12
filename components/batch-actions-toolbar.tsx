"use client"

import { ArchiveIcon, Trash2Icon, MoveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BatchActionsToolbarProps {
  selectedCount: number
  onArchive: () => void
  onDelete: () => void
  onMove: () => void
}

export function BatchActionsToolbar({
  selectedCount,
  onArchive,
  onDelete,
  onMove,
}: BatchActionsToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 border-b bg-muted/30">
      <span className="text-sm font-medium shrink-0">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={onMove}>
          <MoveIcon className="size-3.5" />
          Move
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={onArchive}>
          <ArchiveIcon className="size-3.5" />
          Archive
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2Icon className="size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  )
}

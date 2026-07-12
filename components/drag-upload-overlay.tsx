"use client"

import { UploadIcon } from "lucide-react"

interface DragUploadOverlayProps {
  visible: boolean
}

export function DragUploadOverlay({ visible }: DragUploadOverlayProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary/50 bg-background px-12 py-16 shadow-lg">
        <UploadIcon className="size-10 text-primary/60" />
        <p className="text-lg font-medium">Drop files here</p>
        <p className="text-sm text-muted-foreground">
          to upload them to this folder
        </p>
      </div>
    </div>
  )
}

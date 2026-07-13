"use client"

import { cn } from "@/lib/utils"

interface ProgressProps {
  value?: number
  className?: string
}

export function Progress({ value, className }: ProgressProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-all duration-500")}
        style={
          value != null
            ? { width: `${Math.min(100, Math.max(0, value))}%` }
            : {
                width: "40%",
                animation: "progress-indeterminate 1.4s ease-in-out infinite",
              }
        }
      />
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  )
}

"use client"

import { type ReactNode } from "react"

export function WindowChromeCard({
  breadcrumb,
  children,
}: {
  breadcrumb: string
  children: ReactNode
}) {
  return (
    <div
      className="w-full max-w-sm overflow-hidden rounded-xl border shadow-2xl"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "var(--brand-ink-2, oklch(0.22 0.03 160))",
      }}
    >
      <div className="flex items-center gap-1.5 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "var(--brand-accent, oklch(0.55 0.15 155))" }}
        />
        <span
          className="ml-3 text-xs text-white/50"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {breadcrumb}
        </span>
      </div>
      <div className="bg-background p-8">{children}</div>
    </div>
  )
}

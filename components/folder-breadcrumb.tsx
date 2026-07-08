"use client"

import Link from "next/link"
import { ChevronRightIcon, HomeIcon } from "lucide-react"
import type { BreadcrumbItem } from "@/lib/folder-utils"

export function FolderBreadcrumb({
  items,
}: {
  items: BreadcrumbItem[]
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1">
      <Link
        href="/dashboard"
        className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <HomeIcon className="size-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1">
          <ChevronRightIcon className="size-3 text-muted-foreground/40" />
          {i === items.length - 1 ? (
            <span
              className="text-xs uppercase tracking-[0.15em] text-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {item.name}
            </span>
          ) : (
            <Link
              href={`/dashboard/folders/${item.id}`}
              className="text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors rounded px-1 py-0.5"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {item.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { ChevronDownIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

const ADMIN_LINKS = [
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/categories", label: "Classification" },
  { href: "/dashboard/programs", label: "Programs" },
  { href: "/dashboard/permissions", label: "Permissions" },
  { href: "/dashboard/audit", label: "Audit" },
]

export function AdminMenu() {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80">
        Admin
        <ChevronDownIcon className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {ADMIN_LINKS.map((link) => (
          <DropdownMenuItem
            key={link.href}
            onClick={() => router.push(link.href)}
            className="text-xs uppercase tracking-[0.1em] cursor-pointer"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {link.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

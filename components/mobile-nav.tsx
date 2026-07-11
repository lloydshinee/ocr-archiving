"use client"

import { useState } from "react"
import { MenuIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex md:hidden items-center justify-center size-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed top-16 left-0 right-0 z-50 border-b md:hidden"
            style={{
              backgroundColor: "var(--brand-ink)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              <a
                href="#roles"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                Roles
              </a>
              <a
                href="#features"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                Features
              </a>
              <a
                href="#audit"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                Audit trail
              </a>
            </div>
          </nav>
        </>
      )}
    </>
  )
}

"use client"

import { SetupForm } from "@/components/setup-form"
import { WindowChromeCard } from "@/components/window-chrome-card"

export default function SetupPage() {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center px-4"
      style={{ backgroundColor: "var(--brand-ink, oklch(0.18 0.03 160))" }}
    >
      {/* Folder tab */}
      <div className="px-6 pt-8">
        <div
          className="bg-primary px-6 py-2 text-xs uppercase tracking-[0.2em] text-primary-foreground"
          style={{
            clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0% 100%)",
            fontFamily: "var(--font-mono)",
          }}
        >
          College of Computer Studies
        </div>
      </div>

      {/* Logo area */}
      <div className="mb-6 mt-8 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ccs.png" alt="CCS Logo" className="h-14 w-auto" />
        <h1
          className="text-2xl tracking-tight text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          CCS Archive
        </h1>
      </div>

      <WindowChromeCard breadcrumb="CCS Archive / Setup">
        <SetupForm />
      </WindowChromeCard>

      {/* Footer */}
      <p
        className="mt-8 text-xs text-white/40"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        College of Computer Studies
      </p>
    </div>
  )
}

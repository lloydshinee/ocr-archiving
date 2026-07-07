"use client"

import { useEffect, useState } from "react"
import { LoginForm } from "@/components/login-form"
import { SetupForm } from "@/components/setup-form"
import { WindowChromeCard } from "@/components/window-chrome-card"

export default function LoginPage() {
  const [phase, setPhase] = useState<"checking" | "setup" | "login">("checking")

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/auth/setup", { method: "HEAD" })
      setPhase(res.status === 204 ? "setup" : "login")
    }
    check()
  }, [])

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

      <WindowChromeCard
        breadcrumb={
          phase === "checking"
            ? "CCS Archive / Connecting..."
            : phase === "setup"
              ? "CCS Archive / Setup"
              : "CCS Archive / Sign in"
        }
      >
        {phase === "checking" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex flex-col gap-4">
              <div className="h-10 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ) : phase === "setup" ? (
          <SetupForm />
        ) : (
          <LoginForm />
        )}
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

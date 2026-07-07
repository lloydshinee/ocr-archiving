"use client"

import { useEffect, useState } from "react"
import { LoginForm } from "@/components/login-form"
import { SetupForm } from "@/components/setup-form"

export default function LoginPage() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/auth/setup", { method: "HEAD" })
      setIsFirstRun(res.status === 204)
    }
    check()
  }, [])

  const isChecking = isFirstRun === null

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
        <img
          src="/ccs.png"
          alt="CCS Logo"
          className="h-14 w-auto"
        />
        <h1
          className="text-2xl tracking-tight text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          CCS Archive
        </h1>
      </div>

      {/* Window-chrome card */}
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl border shadow-2xl"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "var(--brand-ink-2, oklch(0.22 0.03 160))",
        }}
      >
        {/* Chrome header */}
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
            {isChecking
              ? "CCS Archive / Connecting..."
              : isFirstRun
                ? "CCS Archive / Setup"
                : "CCS Archive / Sign in"}
          </span>
        </div>

        {/* Paper body */}
        <div className="bg-background p-8">
          {isChecking ? (
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
          ) : isFirstRun ? (
            <SetupForm />
          ) : (
            <LoginForm />
          )}
        </div>
      </div>

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

"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/browser"

export default function SetupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)

    const response = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? "Setup failed.")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

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
            CCS Archive / Setup
          </span>
        </div>

        {/* Paper body */}
        <div className="bg-background p-8">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-1 text-center">
                <h2
                  className="text-xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Create Dean account
                </h2>
                <p className="text-sm text-muted-foreground">
                  Set up the first administrator account
                </p>
              </div>
              <fieldset disabled={loading} className="flex flex-col gap-5">
                <Field>
                  <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Dean Jane Doe"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="dean@ccs.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Creating account..." : "Create account"}
                  </Button>
                </Field>
              </fieldset>
            </FieldGroup>
          </form>
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

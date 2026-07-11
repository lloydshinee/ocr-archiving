"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { ClassificationSection } from "@/components/classification-section"
import { GraduationCapIcon } from "lucide-react"

export default function ProgramsPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()
      setRole(profile?.role ?? null)
      setChecking(false)
    }
    check()
  }, [router])

  if (checking) return null

  if (role !== "dean") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center">
          <span className="text-2xl" style={{ fontFamily: "var(--font-mono)" }}>403</span>
        </div>
        <p className="text-sm text-muted-foreground">Access denied. Only the Dean can manage programs.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
          Programs
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
          Manage Academic Programs
        </p>
      </div>

      <ClassificationSection
        apiBase="/api/programs"
        itemLabel="program"
        itemLabelPlural="programs"
        emptyIcon={GraduationCapIcon}
        emptyText="No programs yet."
        emptyDescription="Create one to organize folders and users by academic program."
        createDescription="Add a new academic program (e.g. BSCS, BSIT)."
      />
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClassificationSection } from "@/components/classification-section"
import { TagsIcon, FileTypeIcon } from "lucide-react"

export default function ClassificationPage() {
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
        <p className="text-sm text-muted-foreground">Access denied. Only the Dean can manage classifications.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
          Classification
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
          Manage Categories & Document Types
        </p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="document-types">Document Types</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="pt-4">
          <ClassificationSection
            apiBase="/api/categories"
            itemLabel="category"
            itemLabelPlural="categories"
            emptyIcon={TagsIcon}
            emptyText="No categories yet."
            emptyDescription="Create one to start classifying documents and folders."
            createDescription="Add a new classification label for documents and folders."
          />
        </TabsContent>

        <TabsContent value="document-types" className="pt-4">
          <ClassificationSection
            apiBase="/api/document-types"
            itemLabel="document type"
            itemLabelPlural="document types"
            emptyIcon={FileTypeIcon}
            emptyText="No document types yet."
            emptyDescription="Create one to classify documents by their form or purpose."
            createDescription="Add a new document type for classifying documents by form or purpose."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

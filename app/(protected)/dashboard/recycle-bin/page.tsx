import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { notFound } from "next/navigation"
import { Trash2Icon } from "lucide-react"
import { RecycleBin } from "./recycle-bin"

export default async function RecycleBinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const isDean = profile?.role === "dean"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Recycle Bin
        </p>
        <div className="mt-1 flex items-center gap-3">
          <Trash2Icon className="size-5 text-muted-foreground" />
          <h1
            className="text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Deleted Items
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Items remain here for 30 days before permanent deletion.
          {isDean && " As Dean, you can manually purge items at any time."}
        </p>
      </div>

      <RecycleBin isDean={isDean} />
    </div>
  )
}

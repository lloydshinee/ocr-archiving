import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { redirect } from "next/navigation"
import { PermissionManager } from "./permission-manager"
import { getUsers, getSidebarFolders } from "@/lib/data-fetching"

export default async function PermissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { data: profile } = await supabase
    .from("users")
    .select("role, program_id")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "dean" && profile.role !== "program_head")) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center">
          <span className="text-2xl" style={{ fontFamily: "var(--font-mono)" }}>403</span>
        </div>
        <p className="text-sm text-muted-foreground">Access denied. Only Dean and Program Heads can manage permissions.</p>
      </div>
    )
  }

  const adminClient = createAdminClient()
  const [users, folders] = await Promise.all([
    getUsers(adminClient, user.id, {
      role: profile.role,
      program_id: profile.program_id,
    }),
    getSidebarFolders(adminClient, user.id, {
      role: profile.role,
      program_id: profile.program_id,
    }),
  ])

  return (
    <PermissionManager
      initialUsers={users}
      initialFolders={folders}
      currentUserRole={profile.role}
    />
  )
}

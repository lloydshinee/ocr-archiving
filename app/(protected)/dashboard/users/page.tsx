import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { UsersTable } from "@/components/users-table"
import { getUsers, getPrograms } from "@/lib/data-fetching"
import { redirect } from "next/navigation"

export default async function UsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, program_id")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "dean" && profile.role !== "program_head")) {
    redirect("/dashboard")
  }

  const adminClient = createAdminClient()
  const [users, programs] = await Promise.all([
    getUsers(adminClient, user.id, {
      role: profile.role,
      program_id: profile.program_id,
    }),
    getPrograms(adminClient),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Users
          </h1>
          <p
            className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Account Management
          </p>
        </div>
      </div>
      <UsersTable
        currentUserId={user.id}
        currentUserRole={profile.role}
        currentUserProgramId={profile.program_id}
        programs={programs}
        users={users}
      />
    </div>
  )
}

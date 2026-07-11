import { createClient } from "@/lib/supabase/server"
import { DashboardPageClient } from "./dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return <DashboardPageClient />
}

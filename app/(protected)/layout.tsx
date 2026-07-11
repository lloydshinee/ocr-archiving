import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { SignoutButton } from "@/components/signout-button"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationBell } from "@/components/notification-bell"
import { AdminMenu } from "@/components/admin-menu"
import { getSidebarFolders, getPrograms } from "@/lib/data-fetching"
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from("users").select("*").eq("id", user.id).single()
    : { data: null }

  const showUsersLink =
    profile &&
    (profile.role === "dean" || profile.role === "program_head")

  const adminClient = createAdminClient()
  const [folders, programs] =
    user && profile
      ? await Promise.all([
          getSidebarFolders(adminClient, user.id, {
            role: profile.role,
            program_id: profile.program_id,
          }),
          getPrograms(adminClient),
        ])
      : [[], []]

  return (
    <SidebarProvider>
      <AppSidebar
        userRole={profile?.role ?? null}
        folders={folders}
        programs={programs}
      />
      <SidebarInset>
        <header
          className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-6"
          style={{
            backgroundColor: "var(--brand-ink)",
          }}
        >
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-white/70 hover:text-white hover:bg-white/10 -ml-2" />
            <span className="text-sm tracking-tight text-white">
              CCS Archive
            </span>
            <Separator
              orientation="vertical"
              className="hidden sm:block h-4 bg-white/10"
            />
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="rounded-md px-2 py-1 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Dashboard
              </Link>
              {showUsersLink && <AdminMenu />}
              <Link
                href="/dashboard/recycle-bin"
                className="rounded-md px-2 py-1 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Bin
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/dashboard/search"
              className="flex sm:hidden items-center justify-center size-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Search"
            >
              <SearchIcon className="size-4" />
            </a>
            <form
              action="/dashboard/search"
              method="GET"
              className="hidden sm:flex items-center"
            >
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
                <input
                  type="text"
                  name="q"
                  placeholder="Search..."
                  className="w-48 rounded-md border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-colors"
                />
              </div>
            </form>
            <NotificationBell />
            {profile && (
              <div className="hidden items-center gap-2 text-sm text-white/75 md:flex">
                <span className="truncate max-w-[120px]">
                  {profile.full_name}
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.12em] text-white/40"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {profile.role}
                </span>
              </div>
            )}
            <SignoutButton />
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

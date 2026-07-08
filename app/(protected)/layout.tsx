import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import { SignoutButton } from "@/components/signout-button"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import Link from "next/link"

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

  return (
    <SidebarProvider>
      <AppSidebar />
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
              className="h-4 bg-white/10"
            />
            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="rounded-md px-2 py-1 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Dashboard
              </Link>
              {showUsersLink && (
                <>
                  <Link
                    href="/dashboard/users"
                    className="rounded-md px-2 py-1 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Users
                  </Link>
                  <Link
                    href="/dashboard/permissions"
                    className="rounded-md px-2 py-1 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Permissions
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
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

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import { SignoutButton } from "@/components/signout-button"

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

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top nav — brand-ink, matching landing page */}
      <header
        className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b px-6"
        style={{
          backgroundColor: "var(--brand-ink, oklch(0.18 0.03 160))",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ccs.png" alt="CCS" className="h-7 w-auto" />
          <span
            className="text-sm tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            CCS Archive
          </span>
          <Separator
            orientation="vertical"
            className="h-4"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage
                  className="text-xs uppercase tracking-[0.15em] text-white/50"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Dashboard
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-4">
          {profile && (
            <div className="hidden items-center gap-2 text-sm text-white/75 md:flex">
              <span className="truncate max-w-[120px]">{profile.full_name}</span>
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

      {/* Page content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  )
}

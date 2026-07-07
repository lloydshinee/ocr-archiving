import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/supabase/database.types"

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone()

  // /setup is always accessible — the API route guards against re-setup
  if (url.pathname === "/setup") {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Authenticated users on /login get redirected to /dashboard
    if (url.pathname === "/login") {
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Unauthenticated users on protected routes -> /login
  if (url.pathname.startsWith("/dashboard")) {
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

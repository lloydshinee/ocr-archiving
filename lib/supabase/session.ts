import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/supabase/database.types"

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone()

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
    if (url.pathname === "/login") {
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    if (url.pathname !== "/setup") {
      const { data: profile } = await supabase
        .from("users")
        .select("is_deactivated")
        .eq("id", user.id)
        .single()

      if (profile?.is_deactivated) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("reason", "deactivated")
        const response = NextResponse.redirect(loginUrl)
        for (const cookie of request.cookies.getAll()) {
          if (cookie.name.startsWith("sb-")) {
            response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" })
          }
        }
        return response
      }
    }

    return supabaseResponse
  }

  if (url.pathname.startsWith("/dashboard")) {
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

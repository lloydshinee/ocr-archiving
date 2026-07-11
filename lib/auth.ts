import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

type UserProfile = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "role" | "program_id" | "full_name"
>

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = "AuthError"
  }
}

export async function requireAuth(supabase?: SupabaseClient<Database>) {
  const client = supabase ?? (await createClient())

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new AuthError(401, "Unauthorized")

  const { data: profile } = await client
    .from("users")
    .select("role, program_id, full_name")
    .eq("id", user.id)
    .single()

  if (!profile) throw new AuthError(404, "User profile not found")

  return { user, profile: profile as UserProfile }
}

export function withErrorHandling<Args extends unknown[]>(
  handler: (
    request: Request,
    ...args: Args
  ) => NextResponse | Promise<NextResponse>,
) {
  return async (request: Request, ...args: Args) => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode },
        )
      }
      console.error(error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      )
    }
  }
}

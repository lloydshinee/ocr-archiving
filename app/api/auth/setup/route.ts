import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function HEAD() {
  const { count } = await adminClient
    .from("users")
    .select("*", { count: "exact", head: true })

  // 204 = no users yet (first-run), 200 = already set up
  return new NextResponse(null, { status: count === 0 ? 204 : 200 })
}

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      )
    }

    const { count } = await adminClient
      .from("users")
      .select("*", { count: "exact", head: true })

    if (count !== 0) {
      return NextResponse.json(
        { error: "Setup has already been completed." },
        { status: 409 },
      )
    }

    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create user." },
        { status: 500 },
      )
    }

    const { error: updateError } = await adminClient
      .from("users")
      .update({ role: "dean", full_name: fullName })
      .eq("id", authUser.user.id)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to assign Dean role." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    )
  }
}

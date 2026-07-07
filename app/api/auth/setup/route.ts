import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { seedReferenceData } from "@/lib/seed"

export async function HEAD() {
  const adminClient = createAdminClient()
  const { count } = await adminClient
    .from("users")
    .select("*", { count: "exact", head: true })

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

    const adminClient = createAdminClient()

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

    const { error: insertError } = await adminClient
      .from("users")
      .insert({
        id: authUser.user.id,
        email,
        role: "dean",
        full_name: fullName,
      })

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to assign Dean role." },
        { status: 500 },
      )
    }

    await seedReferenceData()

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    )
  }
}

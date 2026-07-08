import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canManagePermissions, getFolderEffectivePermissions } from "@/lib/permission-utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const canManage = await canManagePermissions(user.id, id)
    if (!canManage) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const permissions = await getFolderEffectivePermissions(id)

    return NextResponse.json({ permissions })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

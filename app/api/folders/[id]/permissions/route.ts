import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { canManagePermissions, getFolderEffectivePermissions } from "@/lib/permission-utils"

export const GET = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params

  const adminClient = createAdminClient()

  const canManage = await canManagePermissions(adminClient, user.id, id)
  if (!canManage) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const permissions = await getFolderEffectivePermissions(adminClient, id)

  return NextResponse.json({ permissions })
})

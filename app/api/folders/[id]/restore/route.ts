import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { collectDescendantIds } from "@/lib/folder-utils"

export const POST = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params

  const adminClient = createAdminClient()

    const { data: folder } = await adminClient
      .from("folders")
      .select("*")
      .eq("id", id)
      .not("deleted_at", "is", null)
      .single()

    if (!folder) return NextResponse.json({ error: "Folder not found in recycle bin" }, { status: 404 })

    await restoreFolderTree(adminClient, folder)

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "restore_folder",
      resource_type: "folder",
      resource_id: id,
    })

    return NextResponse.json({ success: true })
})

async function restoreFolderTree(
  adminClient: ReturnType<typeof createAdminClient>,
  folder: { id: string; parent_id: string | null },
) {
  const allIds = await collectDescendantIds(adminClient, folder.id)

  for (const fid of allIds) {
    const { data: f } = await adminClient
      .from("folders")
      .select("parent_id")
      .eq("id", fid)
      .single()

    let restoreParentId = f?.parent_id ?? null

    if (restoreParentId && !allIds.includes(restoreParentId)) {
      const { data: parent } = await adminClient
        .from("folders")
        .select("deleted_at")
        .eq("id", restoreParentId)
        .single()

      if (parent?.deleted_at) {
        restoreParentId = null
      }
    }

    await adminClient
      .from("folders")
      .update({
        deleted_at: null,
        deleted_by: null,
        parent_id: restoreParentId,
      })
      .eq("id", fid)
  }

  for (const fid of allIds) {
    await adminClient
      .from("documents")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("folder_id", fid)
      .not("deleted_at", "is", null)
  }
}



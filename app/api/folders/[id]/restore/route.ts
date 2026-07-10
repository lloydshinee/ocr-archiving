import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function restoreFolderTree(
  adminClient: ReturnType<typeof createAdminClient>,
  folder: { id: string; parent_id: string | null },
) {
  const allIds = await collectDeletedDescendantIds(adminClient, folder.id)

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

async function collectDeletedDescendantIds(
  adminClient: ReturnType<typeof createAdminClient>,
  folderId: string,
): Promise<string[]> {
  const result: string[] = [folderId]
  const { data: children } = await adminClient
    .from("folders")
    .select("id")
    .eq("parent_id", folderId)

  if (children) {
    for (const child of children) {
      const descendants = await collectDeletedDescendantIds(adminClient, child.id)
      result.push(...descendants)
    }
  }

  return result
}

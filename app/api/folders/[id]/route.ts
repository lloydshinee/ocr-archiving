import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { getFolderBreadcrumbs } from "@/lib/folder-utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const adminClient = createAdminClient()

    const { data: folder } = await adminClient
      .from("folders")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    const breadcrumbs = await getFolderBreadcrumbsFromDb(folder)

    return NextResponse.json({ folder, breadcrumbs })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "dean") {
      return NextResponse.json(
        { error: "Only the Dean can rename or move folders" },
        { status: 403 },
      )
    }

    const { id } = await params
    const { name, parentId } = await request.json()

    const adminClient = createAdminClient()

    const { data: existing } = await adminClient
      .from("folders")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    const updateData: { name?: string; parent_id?: string | null; updated_by: string; updated_at: string } = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Folder name is required" },
          { status: 400 },
        )
      }
      updateData.name = name.trim()
    }

    if (parentId !== undefined) {
      if (parentId === id) {
        return NextResponse.json(
          { error: "A folder cannot be moved into itself" },
          { status: 400 },
        )
      }
      updateData.parent_id = parentId
    }

    const { data: folder, error } = await adminClient
      .from("folders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ folder })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

async function getFolderBreadcrumbsFromDb(
  folder: { id: string; parent_id: string | null; name: string },
): Promise<{ id: string; name: string }[]> {
  const adminClient = createAdminClient()
  const breadcrumbs: { id: string; name: string }[] = []
  let currentId: string | null = folder.parent_id

  const parentChain: { id: string; name: string }[] = []

  while (currentId) {
    const { data: parent } = await adminClient
      .from("folders")
      .select("id, name, parent_id")
      .eq("id", currentId)
      .is("deleted_at", null)
      .single()

    if (!parent) break

    parentChain.unshift({ id: parent.id, name: parent.name })
    currentId = parent.parent_id
  }

  breadcrumbs.push(...parentChain, { id: folder.id, name: folder.name })

  return breadcrumbs
}

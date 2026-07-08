import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import type { Database } from "@/lib/supabase/database.types"

type FolderRow = Database["public"]["Tables"]["folders"]["Row"]

async function getProgramHeadFolders(programId: string): Promise<FolderRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .rpc("get_program_folder_subtree", { p_program_id: programId })
  if (error) throw error
  return (data as FolderRow[]) ?? []
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("users")
      .select("role, program_id")
      .eq("id", user.id)
      .single()

    if (!profile) return NextResponse.json({ error: "User profile not found" }, { status: 404 })

    const adminClient = createAdminClient()
    let folders: FolderRow[] = []

    if (profile.role === "dean") {
      const { data } = await adminClient
        .from("folders")
        .select("*")
        .is("deleted_at", null)
        .order("name")
      folders = data ?? []
    } else if (profile.role === "program_head" && profile.program_id) {
      folders = await getProgramHeadFolders(profile.program_id)
    } else {
      const { data: userPerms } = await adminClient
        .from("permissions")
        .select("folder_id")
        .eq("user_id", user.id)
        .not("folder_id", "is", null)

      const { data: ownedFolders } = await adminClient
        .from("folders")
        .select("*")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("name")

      const permittedIds = new Set(userPerms?.map((p) => p.folder_id!) ?? [])

      if (ownedFolders) {
        for (const f of ownedFolders) {
          permittedIds.add(f.id)
          folders.push(f)
        }
      }

      if (permittedIds.size > 0) {
        const { data: permFolders } = await adminClient
          .from("folders")
          .select("*")
          .in("id", Array.from(permittedIds))
          .is("deleted_at", null)
          .order("name")

        if (permFolders) {
          for (const f of permFolders) {
            if (!folders.some((existing) => existing.id === f.id)) {
              folders.push(f)
            }
          }
        }
      }
    }

    return NextResponse.json({ folders })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
      .select("role, program_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const { name, parentId, programId } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { isFolderLocked, hasFolderAction } = await import("@/lib/permission-utils")

    if (parentId) {
      const locked = await isFolderLocked(parentId)
      if (locked) {
        const { canBypassLock } = await import("@/lib/permission-utils")
        if (!(await canBypassLock(user.id))) {
          return NextResponse.json({ error: "Parent folder is locked" }, { status: 403 })
        }
      }

      const canCreate = await hasFolderAction(user.id, parentId, "create")
      if (!canCreate) {
        return NextResponse.json({ error: "You do not have permission to create subfolders here" }, { status: 403 })
      }
    }

    if (profile.role === "dean") {
      const { data: folder, error } = await adminClient
        .from("folders")
        .insert({
          name: name.trim(),
          parent_id: parentId ?? null,
          program_id: programId ?? null,
          owner_id: user.id,
          created_by: user.id,
          inherit_permissions: true,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 },
        )
      }

      return NextResponse.json({ folder }, { status: 201 })
    }

    if (profile.role === "program_head" && profile.program_id) {
      if (parentId) {
        const { data: parentFolder } = await adminClient
          .from("folders")
          .select("id, program_id")
          .eq("id", parentId)
          .single()

        if (!parentFolder || parentFolder.program_id !== profile.program_id) {
          return NextResponse.json(
            { error: "You can only create subfolders within your program" },
            { status: 403 },
          )
        }
      } else {
        return NextResponse.json(
          { error: "Program Heads can only create subfolders, not top-level folders" },
          { status: 403 },
        )
      }

      const { data: folder, error } = await adminClient
        .from("folders")
        .insert({
          name: name.trim(),
          parent_id: parentId,
          program_id: profile.program_id,
          owner_id: user.id,
          created_by: user.id,
          inherit_permissions: true,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 },
        )
      }

      return NextResponse.json({ folder }, { status: 201 })
    }

    return NextResponse.json(
      { error: "You do not have permission to create folders" },
      { status: 403 },
    )
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

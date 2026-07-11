import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import type { Database } from "@/lib/supabase/database.types"

type FolderRow = Database["public"]["Tables"]["folders"]["Row"]

async function getProgramHeadFolders(programId: string, showArchived: boolean): Promise<FolderRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .rpc("get_program_folder_subtree", { p_program_id: programId })
  if (error) throw error
  let results = (data as FolderRow[]) ?? []
  if (!showArchived) {
    results = results.filter((f) => !f.is_archived)
  }
  return results
}

export async function GET(request: Request) {
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

    const url = new URL(request.url)
    const showArchived = url.searchParams.get("showArchived") === "true"

    const adminClient = createAdminClient()
    let folders: FolderRow[] = []

    if (profile.role === "dean") {
      let query = adminClient
        .from("folders")
        .select("*")
        .is("deleted_at", null)

      if (!showArchived) {
        query = query.eq("is_archived", false)
      }

      const { data } = await query.order("name")
      folders = data ?? []
    } else if (profile.role === "program_head" && profile.program_id) {
      let cwQuery = adminClient
        .from("folders")
        .select("*")
        .is("deleted_at", null)
        .is("program_id", null)

      if (!showArchived) {
        cwQuery = cwQuery.eq("is_archived", false)
      }

      const [programFolders, collegeWide, permFolderIds] = await Promise.all([
        getProgramHeadFolders(profile.program_id, showArchived),
        cwQuery.order("name"),
        adminClient
          .from("permissions")
          .select("folder_id")
          .eq("user_id", user.id)
          .not("folder_id", "is", null),
      ])
      folders = [
        ...(collegeWide.data ?? []),
        ...programFolders,
      ]

      const viewedIds = new Set(folders.map((f) => f.id))
      const permIds = (permFolderIds.data ?? [])
        .map((p) => p.folder_id!)
        .filter((id) => !viewedIds.has(id))

      if (permIds.length > 0) {
        let permQuery = adminClient
          .from("folders")
          .select("*")
          .in("id", permIds)
          .is("deleted_at", null)

        if (!showArchived) {
          permQuery = permQuery.eq("is_archived", false)
        }

        const { data: permFolders } = await permQuery.order("name")
        if (permFolders) {
          folders.push(...permFolders)
        }
      }
    } else {
      const { data: userPerms } = await adminClient
        .from("permissions")
        .select("folder_id")
        .eq("user_id", user.id)
        .not("folder_id", "is", null)

      let query = adminClient
        .from("folders")
        .select("*")
        .eq("owner_id", user.id)
        .is("deleted_at", null)

      if (!showArchived) {
        query = query.eq("is_archived", false)
      }

      const { data: ownedFolders } = await query.order("name")

      const permittedIds = new Set(userPerms?.map((p) => p.folder_id!) ?? [])

      if (ownedFolders) {
        for (const f of ownedFolders) {
          permittedIds.add(f.id)
          folders.push(f)
        }
      }

      if (permittedIds.size > 0) {
        let permQuery = adminClient
          .from("folders")
          .select("*")
          .in("id", Array.from(permittedIds))
          .is("deleted_at", null)

        if (!showArchived) {
          permQuery = permQuery.eq("is_archived", false)
        }

        const { data: permFolders } = await permQuery.order("name")

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

    let parentLocked = false
    if (parentId) {
      const locked = await isFolderLocked(parentId)
      parentLocked = locked
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
          is_locked: parentLocked || undefined,
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
      }

      const { data: folder, error } = await adminClient
        .from("folders")
        .insert({
          name: name.trim(),
          parent_id: parentId ?? null,
          program_id: programId ?? null,
          owner_id: user.id,
          created_by: user.id,
          inherit_permissions: true,
          is_locked: parentLocked || undefined,
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

    if (parentId) {
      const { data: parentFolder } = await adminClient
        .from("folders")
        .select("program_id")
        .eq("id", parentId)
        .single()

      const { data: folder, error } = await adminClient
        .from("folders")
        .insert({
          name: name.trim(),
          parent_id: parentId,
          program_id: parentFolder?.program_id ?? null,
          owner_id: user.id,
          created_by: user.id,
          inherit_permissions: true,
          is_locked: parentLocked || undefined,
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

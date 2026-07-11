import { createAdminClient } from "@/lib/admin-client"
import type { Database } from "@/lib/supabase/database.types"
import type { UserRole } from "@/lib/user-utils"

type FolderRow = Database["public"]["Tables"]["folders"]["Row"]
type ProgramRow = Database["public"]["Tables"]["programs"]["Row"]

export interface UserWithAuth {
  id: string
  email: string
  full_name: string
  role: UserRole
  program_id: string | null
  is_deactivated: boolean
  deactivated_at: string | null
  created_at: string
  created_by: string | null
  last_sign_in_at: string | null
}

export async function getSidebarFolders(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  profile: { role: string; program_id: string | null },
  showArchived = false,
): Promise<FolderRow[]> {
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

    const { data: programFolders } = await adminClient
      .rpc("get_program_folder_subtree", { p_program_id: profile.program_id })

    let programList = (programFolders as FolderRow[]) ?? []
    if (!showArchived) {
      programList = programList.filter((f) => !f.is_archived)
    }

    const [collegeWide, permFolderIds] = await Promise.all([
      cwQuery.order("name"),
      adminClient
        .from("permissions")
        .select("folder_id")
        .eq("user_id", userId)
        .not("folder_id", "is", null),
    ])

    folders = [
      ...(collegeWide.data ?? []),
      ...programList,
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
      .eq("user_id", userId)
      .not("folder_id", "is", null)

    let query = adminClient
      .from("folders")
      .select("*")
      .eq("owner_id", userId)
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

  return folders
}

export async function getUsers(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  profile: { role: string; program_id: string | null },
): Promise<UserWithAuth[]> {
  const { data: authUsers, error: authError } =
    await adminClient.auth.admin.listUsers()

  if (authError) {
    return []
  }

  let query = adminClient.from("users").select("*")

  if (profile.role === "program_head") {
    query = query.or(
      `program_id.eq.${profile.program_id},created_by.eq.${userId}`,
    )
  }

  const { data: publicUsers } = await query.order("created_at", {
    ascending: false,
  })

  if (!publicUsers) {
    return []
  }

  return publicUsers.map((pu) => {
    const au = authUsers.users.find((u) => u.id === pu.id)
    return {
      id: pu.id,
      email: pu.email,
      full_name: pu.full_name,
      role: pu.role as UserRole,
      program_id: pu.program_id,
      is_deactivated: pu.is_deactivated,
      deactivated_at: pu.deactivated_at,
      created_at: pu.created_at,
      created_by: pu.created_by,
      last_sign_in_at: au?.last_sign_in_at ?? null,
    }
  })
}

export async function getPrograms(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<ProgramRow[]> {
  const { data } = await adminClient
    .from("programs")
    .select("*")
    .order("name")

  return data ?? []
}

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { FolderBreadcrumb } from "@/components/folder-breadcrumb"
import { DocumentDialog } from "@/components/document-dialog"
import { notFound } from "next/navigation"
import { CreateSubfolderDialog } from "./create-subfolder-dialog"
import { FolderActions } from "./folder-actions"
import { hasFolderAction } from "@/lib/permission-utils"
import { FolderContent } from "./folder-content"

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from("users")
    .select("role, program_id")
    .eq("id", user.id)
    .single()

  const adminClient = createAdminClient()

  const { data: folder } = await adminClient
    .from("folders")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (!folder) notFound()

  const breadcrumbs = await getFolderBreadcrumbs(folder)
  const canCreate =
    profile?.role === "dean" ||
    (profile?.role === "program_head" &&
      profile.program_id === folder.program_id)

  const { data: subfolders } = await adminClient
    .from("folders")
    .select("id, name, updated_at, owner_id")
    .eq("parent_id", id)
    .is("deleted_at", null)
    .order("name")

  const { data: documents } = await adminClient
    .from("documents")
    .select("id, title, file_type, owner_id, created_at, current_version_id")
    .eq("folder_id", id)
    .is("deleted_at", null)
    .order("title")

  const { data: ownerProfile } = await adminClient
    .from("users")
    .select("full_name")
    .eq("id", folder.owner_id)
    .single()

  const versionCounts = new Map<string, number>()
  if (documents && documents.length > 0) {
    const docIds = documents.map((d) => d.id)
    const { data: counts } = await adminClient
      .from("document_versions")
      .select("document_id")
      .in("document_id", docIds)

    if (counts) {
      for (const c of counts) {
        versionCounts.set(c.document_id, (versionCounts.get(c.document_id) ?? 0) + 1)
      }
    }
  }

  const documentOwners = new Map<string, string>()
  if (documents && documents.length > 0) {
    const uniqueOwnerIds = [...new Set(documents.map((d) => d.owner_id))]
    const { data: owners } = await adminClient
      .from("users")
      .select("id, full_name")
      .in("id", uniqueOwnerIds)

    if (owners) {
      for (const o of owners) {
        documentOwners.set(o.id, o.full_name)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FolderBreadcrumb items={breadcrumbs} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Folder
          </p>
          <h1
            className="mt-1 text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {folder.name}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p
              className="text-[11px] text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Owner: {ownerProfile?.full_name ?? "Unknown"}
            </p>
            <span
              className="text-[11px] text-muted-foreground/50"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Created{" "}
              {new Date(folder.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="mt-3">
            <FolderActions
              folderId={folder.id}
              folderName={folder.name}
              isLocked={folder.is_locked ?? false}
              isArchived={folder.is_archived ?? false}
              inheritPermissions={folder.inherit_permissions ?? true}
              ownerName={ownerProfile?.full_name ?? "Unknown"}
              userRole={profile?.role ?? ""}
              canArchive={await hasFolderAction(user.id, folder.id, "archive")}
              canDelete={await hasFolderAction(user.id, folder.id, "delete")}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <DocumentDialog mode="upload" folderId={folder.id} folderName={folder.name} />
              <CreateSubfolderDialog parentId={folder.id} parentName={folder.name} />
            </>
          )}
        </div>
      </div>

      <FolderContent
        folderId={folder.id}
        folderName={folder.name}
        subfolders={subfolders ?? []}
        documents={documents ?? []}
        versionCounts={versionCounts}
        documentOwners={documentOwners}
      />
    </div>
  )
}

async function getFolderBreadcrumbs(folder: {
  id: string
  parent_id: string | null
  name: string
}): Promise<{ id: string; name: string }[]> {
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

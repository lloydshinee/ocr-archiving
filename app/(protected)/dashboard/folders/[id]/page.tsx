import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { FolderBreadcrumb } from "@/components/folder-breadcrumb"
import { UploadDocumentDialog } from "@/components/upload-document-dialog"
import { FolderIcon, FileIcon, FileTextIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { notFound } from "next/navigation"
import { CreateSubfolderDialog } from "./create-subfolder-dialog"
import { FolderActions } from "./folder-actions"

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

  const fileTypeIcon = (mime: string) => {
    if (mime.includes("pdf")) return <FileIcon className="size-4 shrink-0" />
    if (mime.includes("image")) return <FileIcon className="size-4 shrink-0 text-orange-400" />
    if (mime.includes("spreadsheet")) return <FileIcon className="size-4 shrink-0 text-green-500" />
    if (mime.includes("presentation")) return <FileIcon className="size-4 shrink-0 text-red-400" />
    return <FileIcon className="size-4 shrink-0 text-muted-foreground" />
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
              inheritPermissions={folder.inherit_permissions ?? true}
              ownerName={ownerProfile?.full_name ?? "Unknown"}
              userRole={profile?.role ?? ""}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <UploadDocumentDialog folderId={folder.id} folderName={folder.name} />
              <CreateSubfolderDialog parentId={folder.id} parentName={folder.name} />
            </>
          )}
        </div>
      </div>

      {(subfolders && subfolders.length > 0) || (documents && documents.length > 0) ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="divide-y">
            {subfolders?.map((sf) => (
              <div
                key={sf.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <a
                  href={`/dashboard/folders/${sf.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <FolderIcon className="size-4 shrink-0 text-primary" />
                  <span className="truncate text-sm">{sf.name}</span>
                </a>
                <span
                  className="shrink-0 text-[11px] text-muted-foreground/50"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {new Date(sf.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}

            {documents?.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <a
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  {fileTypeIcon(doc.file_type)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm">{doc.title}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {versionCounts.get(doc.id) ?? 1} version{(versionCounts.get(doc.id) ?? 1) !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground/50">
                      <span>{documentOwners.get(doc.owner_id) ?? "Unknown"}</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {new Date(doc.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-card shadow-sm">
          <FileTextIcon className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-1">
            This folder is empty
          </p>
          <p
            className="text-[11px] text-muted-foreground/50"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Upload a document or create a subfolder
          </p>
        </div>
      )}
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

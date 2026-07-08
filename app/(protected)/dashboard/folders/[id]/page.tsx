import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { FolderBreadcrumb } from "@/components/folder-breadcrumb"
import { FolderIcon, FileTextIcon } from "lucide-react"
import { notFound } from "next/navigation"
import { CreateSubfolderDialog } from "./create-subfolder-dialog"

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

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

  if (!folder) {
    notFound()
  }

  const breadcrumbs = await getFolderBreadcrumbs(folder)
  const canCreate =
    profile?.role === "dean" ||
    (profile?.role === "program_head" &&
      profile.program_id === folder.program_id)
  // TODO(#5): replace role-based gate with permissions table query for Create permission

  const { data: subfolders } = await adminClient
    .from("folders")
    .select("id, name, updated_at, owner_id")
    .eq("parent_id", id)
    .is("deleted_at", null)
    .order("name")

  const { data: ownerProfile } = await adminClient
    .from("users")
    .select("full_name")
    .eq("id", folder.owner_id)
    .single()

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
        </div>

        {canCreate && (
          <CreateSubfolderDialog parentId={folder.id} parentName={folder.name} />
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {subfolders && subfolders.length > 0 ? (
          <div className="divide-y">
            {subfolders.map((sf) => (
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
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16">
            <FileTextIcon className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No documents yet
            </p>
            <p
              className="text-[11px] text-muted-foreground/50"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Upload a document to get started
            </p>
          </div>
        )}
      </div>
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

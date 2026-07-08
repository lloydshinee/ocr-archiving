import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { FolderBreadcrumb } from "@/components/folder-breadcrumb"
import { notFound } from "next/navigation"
import { FileIcon, DownloadIcon, HistoryIcon, RotateCcwIcon, TagIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const adminClient = createAdminClient()

  const { data: doc } = await adminClient
    .from("documents")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (!doc) notFound()

  const categoryPromise = doc.category_id
    ? adminClient.from("categories").select("name").eq("id", doc.category_id).single()
    : Promise.resolve({ data: null })

  const docTypePromise = doc.document_type_id
    ? adminClient.from("document_types").select("name").eq("id", doc.document_type_id).single()
    : Promise.resolve({ data: null })

  const { data: tagLinks } = await adminClient
    .from("document_tags")
    .select("tag_id")
    .eq("document_id", id)

  let tags: { id: string; name: string }[] = []
  if (tagLinks && tagLinks.length > 0) {
    const { data: tagData } = await adminClient
      .from("tags")
      .select("id, name")
      .in("id", tagLinks.map((t) => t.tag_id))
    tags = tagData ?? []
  }

  const { data: versions } = await adminClient
    .from("document_versions")
    .select("*")
    .eq("document_id", id)
    .order("version_number", { ascending: false })

  const { data: owner } = await adminClient
    .from("users")
    .select("full_name")
    .eq("id", doc.owner_id)
    .single()

  const [{ data: categoryData }, { data: docTypeData }] = await Promise.all([
    categoryPromise,
    docTypePromise,
  ])

  const breadcrumbs = await getFolderPath(doc.folder_id)

  return (
    <div className="flex flex-col gap-6">
      <FolderBreadcrumb items={breadcrumbs} />

      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Document
        </p>
        <h1
          className="mt-1 text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {doc.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {docTypeData?.name && (
            <Badge variant="outline">{docTypeData.name}</Badge>
          )}
          {categoryData?.name && (
            <Badge variant="secondary">{categoryData.name}</Badge>
          )}
          {tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <TagIcon className="mr-1 size-3" />
              {t.name}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>
            Uploaded by{" "}
            <span className="font-medium text-foreground">
              {owner?.full_name ?? "Unknown"}
            </span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {new Date(doc.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>
            Modified{" "}
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {new Date(doc.updated_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {versions?.length ?? 0} version{(versions?.length ?? 0) !== 1 ? "s" : ""}
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      </div>

      {doc.description && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {doc.description}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/documents/${doc.id}/download`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <DownloadIcon className="size-4" /> Download
        </a>
        <a
          href={`/api/documents/${doc.id}/download`}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <FileIcon className="size-4" /> Current version (v
          {versions?.find((v) => v.id === doc.current_version_id)?.version_number ?? "?"})
        </a>
      </div>

      {versions && versions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <HistoryIcon className="size-3.5 text-muted-foreground" />
            <p
              className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Version history
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="text-xs text-primary font-medium shrink-0"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      v{v.version_number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm">
                          {v.file_path.split("/").pop()}
                        </span>
                        {v.id === doc.current_version_id && (
                          <Badge variant="outline" className="text-[10px]">
                            current
                          </Badge>
                        )}
                      </div>
                      <div
                        className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground/50"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <span>{(v.file_size / 1024).toFixed(1)} KB</span>
                        <span>
                          {new Date(v.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`/api/documents/${doc.id}/download?version=${v.id}`}
                      className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Download this version"
                    >
                      <DownloadIcon className="size-3.5" />
                    </a>
                    {v.id !== doc.current_version_id && (
                      <form
                        action={`/api/documents/${doc.id}/versions`}
                        method="POST"
                      >
                        <input type="hidden" name="versionId" value={v.id} />
                        <button
                          type="submit"
                          className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          title="Restore this version"
                        >
                          <RotateCcwIcon className="size-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

async function getFolderPath(
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const adminClient = createAdminClient()
  const breadcrumbs: { id: string; name: string }[] = []
  let currentId: string | null = folderId

  while (currentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await adminClient
      .from("folders")
      .select("id, name, parent_id")
      .eq("id", currentId)
      .is("deleted_at", null)
      .single()

    const folder = result.data as { id: string; name: string; parent_id: string | null } | null

    if (!folder) break

    breadcrumbs.unshift({ id: folder.id, name: folder.name })
    currentId = folder.parent_id
  }

  return breadcrumbs
}

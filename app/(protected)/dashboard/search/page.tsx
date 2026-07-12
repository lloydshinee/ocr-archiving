import { SearchIcon, FolderIcon, FilterIcon } from "lucide-react"
import { fileTypeIcon, fileTypeLabel } from "@/lib/file-icons"
import { Badge } from "@/components/ui/badge"
import { createAdminClient } from "@/lib/admin-client"
import { createClient } from "@/lib/supabase/server"
import { OcrStatusBadge } from "@/components/ocr-status-badge"
import { OcrViewerButton } from "@/components/ocr-viewer-button"
import { filterSearchResults, isOcrEligible, type SearchResultItem } from "@/lib/search-utils"
import Link from "next/link"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; type?: string; owner?: string; from?: string; to?: string; format?: string }>
}) {
  const { q, category, type, owner, from, to, format } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminClient = createAdminClient()

  const { data: categories } = await adminClient.from("categories").select("id, name").order("name")
  const { data: documentTypes } = await adminClient.from("document_types").select("id, name").order("name")

  const hasFilters = !!(category || type || owner || from || to || format)

  let results: SearchResultItem[] = []
  let total = 0

  if (q && user) {
    const { data } = await adminClient.rpc("search_archives", {
      p_query: q,
      p_category_id: category || undefined,
      p_document_type_id: type || undefined,
      p_owner_id: owner || undefined,
      p_date_from: from || undefined,
      p_date_to: to || undefined,
      p_file_type: format || undefined,
      p_limit: 150,
      p_offset: 0,
    }) as { data: SearchResultItem[] | null }

    if (data) {
      results = await filterSearchResults(adminClient, data, user.id)
      total = results.length
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Search
        </p>
        <h1
          className="mt-1 text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {q ? `Results for "${q}"` : "Search archives"}
        </h1>
      </div>

      <form method="GET" action="/dashboard/search" className="flex flex-col gap-3">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name, content, tags..."
            className="w-full rounded-xl border bg-background pl-12 pr-4 py-3.5 text-sm shadow-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            autoFocus={!q}
            style={{ fontFamily: "var(--font-sans)" }}
          />
        </div>

        <details className="group" open={hasFilters}>
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors list-none">
            <FilterIcon className="size-3.5" />
            <span style={{ fontFamily: "var(--font-mono)" }}>Filters</span>
            {hasFilters && (
              <a
                href="/dashboard/search"
                className="ml-2 text-[10px] text-primary hover:underline"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Clear
              </a>
            )}
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <select
              name="category"
              defaultValue={category}
              className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              name="type"
              defaultValue={type}
              className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <option value="">All document types</option>
              {documentTypes?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              name="format"
              defaultValue={format}
              className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <option value="">All formats</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="xlsx">XLSX</option>
              <option value="pptx">PPTX</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="plain">TXT</option>
              <option value="zip">ZIP</option>
            </select>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0" style={{ fontFamily: "var(--font-mono)" }}>
                From:
              </label>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0" style={{ fontFamily: "var(--font-mono)" }}>
                To:
              </label>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg border bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Apply filters
            </button>
          </div>
        </details>
      </form>

      {q && (
        <>
          <p
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {total} result{total !== 1 ? "s" : ""}
          </p>

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <SearchIcon className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No results found. Try different search terms or filters.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((result) => (
                <ResultCard key={`${result.result_type}-${result.id}`} result={result} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ResultCard({ result }: { result: SearchResultItem }) {
  const isFolder = result.result_type === "folder"
  const href = isFolder
    ? `/dashboard/folders/${result.id}`
    : `/dashboard/documents/${result.id}`

  return (
    <Link
      href={href}
      className="group block rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/30"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isFolder ? (
            <FolderIcon className="size-5 text-muted-foreground" />
          ) : (
            <span className="mt-0.5 block">{fileTypeIcon(result.file_type ?? "")}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{result.title}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {isFolder ? "Folder" : fileTypeLabel(result.file_type ?? "")}
            </Badge>
            {!isFolder && result.ocr_status === "completed" && isOcrEligible(result.file_type) ? (
              <OcrViewerButton
                documentId={result.id}
                title={result.title}
                status={result.ocr_status}
              />
            ) : !isFolder && result.ocr_status && isOcrEligible(result.file_type) ? (
              <OcrStatusBadge status={result.ocr_status} />
            ) : null}
          </div>

          {result.match_headline && (
            <p
              className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: result.match_headline }}
            />
          )}

          <div
            className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground/60"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {result.folder_path && (
              <span className="truncate">{result.folder_path}</span>
            )}
            {!result.folder_path && result.folder_id && <span>Root</span>}
            <span>by {result.owner_name}</span>
            {!isFolder && result.file_size != null && (
              <span>{(result.file_size / 1024 / 1024).toFixed(2)} MB</span>
            )}
            <span>
              {new Date(result.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { getUserProfile } from "@/lib/permission-utils"
import { filterSearchResults, type SearchResultItem } from "@/lib/search-utils"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profile = await getUserProfile(user.id)
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(request.url)
    const q = url.searchParams.get("q")?.trim()
    const categoryId = url.searchParams.get("category") || undefined
    const documentTypeId = url.searchParams.get("type") || undefined
    const ownerId = url.searchParams.get("owner") || undefined
    const dateFrom = url.searchParams.get("from") || undefined
    const dateTo = url.searchParams.get("to") || undefined
    const fileType = url.searchParams.get("format") || undefined
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100)
    const offset = parseInt(url.searchParams.get("offset") || "0", 10)

    if (!q) {
      return NextResponse.json({ results: [], total: 0 })
    }

    const adminClient = createAdminClient()

    const { data: results, error } = await adminClient.rpc("search_archives", {
      p_query: q,
      p_category_id: categoryId,
      p_document_type_id: documentTypeId,
      p_owner_id: ownerId,
      p_date_from: dateFrom || undefined,
      p_date_to: dateTo || undefined,
      p_file_type: fileType,
      p_limit: limit * 3,
      p_offset: 0,
    }) as { data: SearchResultItem[] | null; error: unknown }

    if (error) {
      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }

    if (!results || results.length === 0) {
      return NextResponse.json({ results: [], total: 0 })
    }

    const filtered = await filterSearchResults(results, user.id)

    const total = filtered.length
    const page = filtered.slice(offset, offset + limit)

    return NextResponse.json({ results: page, total })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

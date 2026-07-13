import { extractText as fullExtractText } from "@/lib/document-extractor"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { filterSearchResults, type SearchResultItem } from "@/lib/search-utils"
import { hasFolderAction } from "@/lib/permission-utils"

export interface FolderSuggestion {
  folderId: string
  score: number
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
}

async function getNameMatchScores(
  text: string,
  adminClient: SupabaseClient<Database>,
): Promise<Map<string, { score: number; parentPath: string }>> {
  const { data: folders } = await adminClient
    .from("folders")
    .select("id, name, parent_id")
    .is("deleted_at", null)
    .eq("is_archived", false)

  if (!folders) return new Map()

  const folderMap = new Map(folders.map((f) => [f.id, f]))

  function resolveParentPath(folderId: string | null): string {
    if (!folderId) return ""
    const parent = folderMap.get(folderId)
    if (!parent) return ""
    const grandparent = resolveParentPath(parent.parent_id)
    return grandparent ? `${grandparent} > ${parent.name}` : parent.name
  }

  const textTokens = new Set(tokenize(text))
  const scores = new Map<string, { score: number; parentPath: string }>()

  for (const folder of folders) {
    const parentPath = resolveParentPath(folder.parent_id)
    const nameTokens = tokenize(folder.name)
    const pathTokens = tokenize(parentPath)
    const allTokens = [...new Set([...nameTokens, ...pathTokens])]

    if (allTokens.length === 0) continue

    const matched = allTokens.filter((t) => textTokens.has(t)).length
    const score = matched / allTokens.length

    if (score > 0) {
      scores.set(folder.id, { score, parentPath })
    }
  }

  return scores
}

export async function suggestFolder(
  adminClient: SupabaseClient<Database>,
  buffer: Buffer,
  fileName: string,
  fileType: string,
  userId: string,
  skipExtraction = false,
): Promise<{ suggestions: FolderSuggestion[]; extractedText: string | null }> {
  let query = fileName.replace(/\.[^.]+$/, "")
  let extractedText: string | null = null

  if (!skipExtraction) {
    try {
      const text = await fullExtractText(buffer, fileType)
      if (text) {
        extractedText = text
        const words = text.trim().split(/\s+/).filter((w) => /[a-zA-Z]{3,}/.test(w))
        if (words.length >= 3) {
          query = query + " " + text.trim().slice(0, 500)
        }
      }
    } catch {
      // fall back to filename-only search
    }
  }

  const nameScores = extractedText
    ? await getNameMatchScores(extractedText, adminClient)
    : new Map<string, { score: number; parentPath: string }>()

  const { data: results } = (await adminClient.rpc("search_archives", {
    p_query: query,
    p_include_archived: false,
    p_limit: 100,
    p_offset: 0,
  })) as { data: SearchResultItem[] | null }

  const permitted = results ? await filterSearchResults(adminClient, results, userId) : []

  const searchCounts = new Map<string, number>()
  for (const r of permitted) {
    if (!r.folder_id) continue
    searchCounts.set(r.folder_id, (searchCounts.get(r.folder_id) ?? 0) + 1)
  }

  const allFolderIds = new Set([...nameScores.keys(), ...searchCounts.keys()])
  const maxSearch = Math.max(...searchCounts.values(), 1)
  const combined: { folderId: string; score: number }[] = []

  for (const folderId of allFolderIds) {
    const nameScore = nameScores.get(folderId)?.score ?? 0
    const searchScore = searchCounts.get(folderId) ?? 0
    const total = nameScore * 3 + searchScore / maxSearch
    if (total > 0) {
      combined.push({ folderId, score: total })
    }
  }

  combined.sort((a, b) => b.score - a.score)

  const suggestions: FolderSuggestion[] = []
  for (const s of combined.slice(0, 10)) {
    const canCreate = await hasFolderAction(adminClient, userId, s.folderId, "create")
    if (canCreate) {
      suggestions.push({ folderId: s.folderId, score: Math.round(s.score * 100) / 100 })
      if (suggestions.length >= 3) break
    }
  }

  return { suggestions, extractedText }
}

import mammoth from "mammoth"
import * as XLSX from "xlsx"
import AdmZip from "adm-zip"
import { PDFParse } from "pdf-parse"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { filterSearchResults, type SearchResultItem } from "@/lib/search-utils"
import { hasFolderAction } from "@/lib/permission-utils"

export interface FolderSuggestion {
  folderId: string
  score: number
}

const IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/tiff", "image/bmp", "image/gif",
])

async function extractFileText(buffer: Buffer, fileType: string): Promise<string | null> {
  if (IMAGE_TYPES.has(fileType)) return null
  if (fileType === "text/plain") return buffer.toString("utf-8").trim() || null

  if (fileType === "application/pdf") {
    const doc = new PDFParse({ data: buffer })
    const result = await doc.getText({ pageJoiner: "\n", lineEnforce: false })
    await doc.destroy()
    const t = result.text?.trim()
    if (t && t.length > 20) return t
    return null
  }

  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

  if (fileType === DOCX) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim() || null
  }

  if (fileType === XLSX_TYPE) {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const texts: string[] = []
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) continue
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][]
      for (const row of rows) {
        for (const cell of row) {
          if (cell != null && String(cell).trim()) texts.push(String(cell).trim())
        }
      }
    }
    return texts.join("\n") || null
  }

  if (fileType === PPTX) {
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()
    const slides = entries
      .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
      .sort((a, b) => {
        const na = parseInt(a.entryName.match(/\d+/)?.[0] ?? "0")
        const nb = parseInt(b.entryName.match(/\d+/)?.[0] ?? "0")
        return na - nb
      })
    const texts: string[] = []
    for (const entry of slides) {
      const content = entry.getData().toString("utf-8")
      const matches = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g)
      if (!matches) continue
      for (const m of matches) {
        const inner = m.replace(/<[^>]+>/g, "")
        if (inner.trim()) texts.push(inner.trim())
      }
    }
    return texts.join("\n") || null
  }

  return null
}

export async function suggestFolder(
  adminClient: SupabaseClient<Database>,
  buffer: Buffer,
  fileName: string,
  fileType: string,
  userId: string,
  skipExtraction = false,
): Promise<FolderSuggestion[]> {
  let query = fileName.replace(/\.[^.]+$/, "")

  if (!skipExtraction) {
    try {
      const text = await extractFileText(buffer, fileType)
      if (text) {
        const words = text.trim().split(/\s+/).filter((w) => /[a-zA-Z]{3,}/.test(w))
        if (words.length >= 3) {
          query = query + " " + text.trim().slice(0, 500)
        }
      }
    } catch {
      // fall back to filename-only search
    }
  }

  const { data: results } = await adminClient.rpc("search_archives", {
    p_query: query,
    p_include_archived: false,
    p_limit: 100,
    p_offset: 0,
  }) as { data: SearchResultItem[] | null }

  if (!results || results.length === 0) return []

  const permitted = await filterSearchResults(adminClient, results, userId)
  if (permitted.length === 0) return []

  const folderCounts = new Map<string, number>()
  for (const r of permitted) {
    if (!r.folder_id) continue
    folderCounts.set(r.folder_id, (folderCounts.get(r.folder_id) ?? 0) + 1)
  }

  const scored = Array.from(folderCounts.entries())
    .map(([folderId, count]) => ({ folderId, score: count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const suggestions: FolderSuggestion[] = []
  for (const s of scored) {
    const canCreate = await hasFolderAction(adminClient, userId, s.folderId, "create")
    if (canCreate) suggestions.push(s)
  }

  return suggestions
}

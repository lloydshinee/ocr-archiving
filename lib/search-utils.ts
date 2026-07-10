import { getUserProfile, hasDocumentAction, hasFolderAction } from "@/lib/permission-utils"

export type SearchResultItem = {
  id: string
  result_type: string
  title: string
  description: string | null
  folder_id: string
  folder_path: string | null
  created_at: string
  updated_at: string
  owner_id: string
  owner_name: string
  file_type: string | null
  file_size: number | null
  ocr_status: string | null
  match_headline: string | null
  rank: number
}

export async function filterSearchResults(
  results: SearchResultItem[],
  userId: string,
): Promise<SearchResultItem[]> {
  const profile = await getUserProfile(userId)
  if (!profile) return []

  const isDean = profile.role === "dean"
  const filtered: SearchResultItem[] = []

  for (const result of results) {
    if (isDean || profile.role === "program_head") {
      filtered.push(result)
      continue
    }

    if (result.owner_id === userId) {
      filtered.push(result)
      continue
    }

    const canView = result.result_type === "folder"
      ? await hasFolderAction(userId, result.id, "view")
      : await hasDocumentAction(userId, result.id, "view")

    if (canView) filtered.push(result)
  }

  return filtered
}

export function isOcrEligible(fileType: string | null): boolean {
  if (!fileType) return false
  const extractableTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]
  return extractableTypes.includes(fileType)
}

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { suggestFolder, type FolderSuggestion } from "@/lib/document-classifier"

const TIMEOUT_MS = 12_000

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<{ value: T } | { timedOut: true }> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms)
  })
  try {
    const value = await Promise.race([promise, timeout])
    clearTimeout(timer!)
    return { value }
  } catch (err) {
    if (err instanceof Error && err.message === "timeout") {
      return { timedOut: true as const }
    }
    throw err
  }
}

export const POST = withErrorHandling(async (request: Request) => {
  const { user } = await requireAuth()
  const adminClient = createAdminClient()

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const first = await withTimeout(
    suggestFolder(adminClient, buffer, file.name, file.type, user.id),
    TIMEOUT_MS,
  )

  if ("timedOut" in first) {
    const fallback = await suggestFolder(adminClient, buffer, file.name, file.type, user.id, true)
    return NextResponse.json({ suggestions: fallback, timed_out: true })
  }

  return NextResponse.json({ suggestions: first.value })
})

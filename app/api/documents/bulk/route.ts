import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { createDocument, ValidationError } from "@/lib/document-service"

export const POST = withErrorHandling(async (request: Request) => {
  const { user } = await requireAuth()

  const formData = await request.formData()
  const folderId = formData.get("folderId") as string | null

  if (!folderId) {
    return NextResponse.json({ error: "Folder is required" }, { status: 400 })
  }

  const files: File[] = []
  for (const [key, value] of formData.entries()) {
    if (key === "files" && value instanceof File) {
      files.push(value)
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one file is required" }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const documents: Record<string, unknown>[] = []
  const errors: { index: number; error: string; name: string }[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const doc = await createDocument({
        adminClient,
        user,
        file,
        folderId,
        title: null,
      })
      documents.push(doc)
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({ index: i, error: error.message, name: file.name })
      } else {
        errors.push({ index: i, error: "Upload failed", name: file.name })
      }
    }
  }

  return NextResponse.json({ documents, errors }, { status: 201 })
})

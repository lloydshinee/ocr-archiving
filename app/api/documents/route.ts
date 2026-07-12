import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { createDocument, ValidationError } from "@/lib/document-service"

export const POST = withErrorHandling(async (request: Request) => {
  const { user } = await requireAuth()

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const title = formData.get("title") as string | null
  const description = formData.get("description") as string | null
  const folderId = formData.get("folderId") as string | null
  const categoryId = formData.get("categoryId") as string | null
  const documentTypeId = formData.get("documentTypeId") as string | null
  const tagsStr = formData.get("tags") as string | null

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 })
  }

  if (!folderId) {
    return NextResponse.json({ error: "Folder is required" }, { status: 400 })
  }

  const adminClient = createAdminClient()

  try {
    const doc = await createDocument({
      adminClient,
      user,
      file,
      folderId,
      title,
      description,
      categoryId,
      documentTypeId,
      tagsStr,
    })

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }
})

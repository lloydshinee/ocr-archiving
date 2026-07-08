import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/zip",
]

const MAX_FILE_SIZE = 100 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file format. Accepted: PDF, DOCX, XLSX, PPTX, JPG, PNG, TXT, ZIP" },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient()

    const { data: folder } = await adminClient
      .from("folders")
      .select("id")
      .eq("id", folderId)
      .is("deleted_at", null)
      .single()

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    const docTitle = title?.trim() || file.name.replace(/\.[^.]+$/, "")
    const tagNames = tagsStr
      ? tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    const bytes = await file.arrayBuffer()
    const buffer = new Uint8Array(bytes)

    const { data: doc } = await adminClient
      .from("documents")
      .insert({
        title: docTitle,
        description: description?.trim() ?? null,
        folder_id: folderId,
        category_id: categoryId || null,
        document_type_id: documentTypeId || null,
        owner_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      })
      .select()
      .single()

    if (!doc) {
      return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
    }

    const storagePath = `${doc.id}/v1-${file.name}`

    const { error: uploadError } = await adminClient.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      await adminClient.from("documents").delete().eq("id", doc.id)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    const { data: version } = await adminClient
      .from("document_versions")
      .insert({
        document_id: doc.id,
        version_number: 1,
        file_path: storagePath,
        file_size: file.size,
        file_type: file.type,
        created_by: user.id,
      })
      .select()
      .single()

    if (version) {
      await adminClient
        .from("documents")
        .update({ current_version_id: version.id })
        .eq("id", doc.id)
    }

    if (tagNames.length > 0) {
      for (const tagName of tagNames) {
        const { data: existing } = await adminClient
          .from("tags")
          .select("id")
          .eq("name", tagName)
          .single()

        let tagId = existing?.id

        if (!tagId) {
          const { data: newTag } = await adminClient
            .from("tags")
            .insert({ name: tagName })
            .select()
            .single()
          tagId = newTag?.id
        }

        if (tagId) {
          await adminClient
            .from("document_tags")
            .insert({ document_id: doc.id, tag_id: tagId })
        }
      }
    }

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "upload",
      resource_type: "document",
      resource_id: doc.id,
      details: { file_name: file.name, file_size: file.size },
    })

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

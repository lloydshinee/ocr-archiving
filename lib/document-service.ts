import { createAdminClient } from "@/lib/admin-client"
type AdminClient = ReturnType<typeof createAdminClient>
import { isFolderLocked, canBypassLock, hasFolderAction } from "@/lib/permission-utils"
import { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE, TEXT_EXTRACTABLE_TYPES } from "@/lib/constants"
import { truncateFilename } from "@/lib/utils"

interface CreateDocumentParams {
  adminClient: AdminClient
  user: { id: string }
  file: File
  folderId: string
  title?: string | null
  description?: string | null
  categoryId?: string | null
  documentTypeId?: string | null
  tagsStr?: string | null
}

export async function createDocument(params: CreateDocumentParams) {
  const { adminClient, user, file, folderId, title, description, categoryId, documentTypeId, tagsStr } = params
  const fileName = truncateFilename(file.name)

  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    throw new ValidationError("Invalid file format")
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File size exceeds 100MB limit")
  }

  const { data: folder } = await adminClient
    .from("folders")
    .select("id")
    .eq("id", folderId)
    .is("deleted_at", null)
    .single()

  if (!folder) {
    throw new ValidationError("Folder not found")
  }

  const locked = await isFolderLocked(adminClient, folderId)
  if (locked && !(await canBypassLock(adminClient, user.id))) {
    throw new ValidationError("This folder is locked")
  }

  const canCreate = await hasFolderAction(adminClient, user.id, folderId, "create")
  if (!canCreate) {
    throw new ValidationError("You don't have permission to upload to this folder")
  }

  const docTitle = title?.trim() || fileName.replace(/\.[^.]+$/, "")
  const tagNames = tagsStr
    ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
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
      file_name: fileName,
      file_size: file.size,
      file_type: file.type,
    })
    .select()
    .single()

  if (!doc) {
    throw new Error("Failed to create document")
  }

  const storagePath = `${doc.id}/v1-${fileName}`

  const { error: uploadError } = await adminClient.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    await adminClient.from("documents").delete().eq("id", doc.id)
    throw new Error("Failed to upload file")
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

    if (TEXT_EXTRACTABLE_TYPES.includes(file.type)) {
      await adminClient.from("ocr_jobs").insert({
        version_id: version.id,
        document_id: doc.id,
        status: "pending",
      })
    }
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
    details: { file_name: fileName, file_size: file.size },
  })

  const { data: usersWithView } = await adminClient
    .from("permissions")
    .select("user_id")
    .eq("folder_id", folderId)
    .contains("actions", ["view"])

  if (usersWithView) {
    const notified = new Set<string>()
    for (const p of usersWithView) {
      if (p.user_id !== user.id && !notified.has(p.user_id)) {
        notified.add(p.user_id)
        await adminClient.from("notifications").insert({
          user_id: p.user_id,
          type: "document",
          title: "New document uploaded",
          body: `"${docTitle}" was uploaded to a folder you can access`,
          resource_type: "document",
          resource_id: doc.id,
        })
      }
    }
  }

  return doc
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

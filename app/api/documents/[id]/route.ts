import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import {
  hasDocumentAction,
  isFolderLocked,
  canBypassLock,
} from "@/lib/permission-utils"

export const GET = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params

  const adminClient = createAdminClient()

  const canView = await hasDocumentAction(adminClient, user.id, id, "view")
  if (!canView) return NextResponse.json({ error: "Access denied" }, { status: 403 })

  const { data: doc } = await adminClient
    .from("documents")
    .select("*, category:categories(name), document_type:document_types(name)")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  const { data: versions } = await adminClient
    .from("document_versions")
    .select("*")
    .eq("document_id", id)
    .order("version_number", { ascending: false })

  const { data: tagLinks } = await adminClient
    .from("document_tags")
    .select("tag_id")
    .eq("document_id", id)

  let tags: { id: string; name: string }[] = []

  if (tagLinks && tagLinks.length > 0) {
    const { data: tagData } = await adminClient
      .from("tags")
      .select("id, name")
      .in(
        "id",
        tagLinks.map((t) => t.tag_id),
      )
    tags = tagData ?? []
  }

  const { data: owner } = await adminClient
    .from("users")
    .select("full_name")
    .eq("id", doc.owner_id)
    .single()

  const currentVersion = versions?.find(
    (v) => v.id === doc.current_version_id,
  )

  return NextResponse.json({
    document: {
      ...doc,
      tags,
      owner_name: owner?.full_name ?? "Unknown",
      version_count: versions?.length ?? 0,
      current_version_number: currentVersion?.version_number ?? null,
    },
    versions: versions ?? [],
    tags,
  })
})

export const PATCH = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user, profile } = await requireAuth()

  const { id } = await params
  const body = await request.json()
  const { title, description, folderId, categoryId, documentTypeId, tags: tagsStr } = body

  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from("documents")
    .select("id, title, description, owner_id, folder_id, category_id, document_type_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 })

  const { data: existingTagLinks } = await adminClient
    .from("document_tags")
    .select("tag_id")
    .eq("document_id", id)
  const tagIds = existingTagLinks?.map((t) => t.tag_id) ?? []
  const existingTags: string[] = []
  if (tagIds.length > 0) {
    const { data: tagRows } = await adminClient
      .from("tags")
      .select("name")
      .in("id", tagIds)
    if (tagRows) existingTags.push(...tagRows.map((t) => t.name))
  }
  const existingTagsStr = existingTags.join(", ").trim()

  const normalizeTags = (s: string | undefined): string => {
    if (!s || !s.trim()) return ""
    return s.split(",").map((t) => t.trim()).filter(Boolean).sort().join(", ")
  }
  const submittedTags = normalizeTags(tagsStr)
  const storedTags = normalizeTags(existingTagsStr)
  const tagsChanged = tagsStr !== undefined && submittedTags !== storedTags

  const oldFolderId = existing.folder_id
  const moving = folderId !== undefined && folderId !== oldFolderId
  const hasMetadataChanges =
    (title !== undefined && title.trim() !== existing.title) ||
    (description !== undefined && (description?.trim() ?? null) !== (existing.description ?? null)) ||
    (categoryId !== undefined && (categoryId || null) !== existing.category_id) ||
    (documentTypeId !== undefined && (documentTypeId || null) !== existing.document_type_id) ||
    tagsChanged

  if (moving) {
    const canMove = await hasDocumentAction(adminClient, user.id, id, "move")
    if (!canMove) return NextResponse.json({ error: "You do not have permission to move this document" }, { status: 403 })

    if (existing.folder_id) {
      const locked = await isFolderLocked(adminClient, existing.folder_id)
      if (locked && !(await canBypassLock(adminClient, user.id))) {
        return NextResponse.json({ error: "The source folder is locked" }, { status: 403 })
      }
    }

    if (folderId) {
      const targetLocked = await isFolderLocked(adminClient, folderId)
      if (targetLocked && !(await canBypassLock(adminClient, user.id))) {
        return NextResponse.json({ error: "The destination folder is locked" }, { status: 403 })
      }
    }
  }

  if (hasMetadataChanges) {
    const canEdit = await hasDocumentAction(adminClient, user.id, id, "edit")
    if (!canEdit) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const isDean = profile.role === "dean"

  const updateData: {
    updated_at: string
    title?: string
    description?: string | null
    folder_id?: string
    category_id?: string | null
    document_type_id?: string | null
  } = {
    updated_at: new Date().toISOString(),
  }

  if (title !== undefined && title.trim().length > 0) {
    updateData.title = title.trim()
  }

  if (description !== undefined) {
    updateData.description = description?.trim() ?? null
  }

  if (folderId !== undefined) {
    updateData.folder_id = folderId
  }

  if ((isDean || profile.role === "program_head") && categoryId !== undefined) {
    updateData.category_id = categoryId || null
  }

  if ((isDean || profile.role === "program_head") && documentTypeId !== undefined) {
    updateData.document_type_id = documentTypeId || null
  }

  if (tagsStr !== undefined) {
    const tagNames: string[] = tagsStr
      ? tagsStr.split(",").map((t: string) => t.trim()).filter(Boolean)
      : []

    await adminClient.from("document_tags").delete().eq("document_id", id)

    for (const tagName of tagNames) {
      const { data: existingTag } = await adminClient
        .from("tags")
        .select("id")
        .eq("name", tagName)
        .single()

      let tagId = existingTag?.id

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
          .insert({ document_id: id, tag_id: tagId })
      }
    }
  }

  const { data: doc, error } = await adminClient
    .from("documents")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (folderId !== undefined && folderId !== oldFolderId) {
    const fromName = oldFolderId
      ? (await adminClient.from("folders").select("name").eq("id", oldFolderId).single()).data?.name
      : null
    const toName = folderId
      ? (await adminClient.from("folders").select("name").eq("id", folderId).single()).data?.name
      : null
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "move",
      resource_type: "document",
      resource_id: id,
      details: { item: existing.title, from: fromName ?? "(root)", to: toName ?? "(root)" },
    })
  }

  if (hasMetadataChanges) {
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "edit",
      resource_type: "document",
      resource_id: id,
      details: { item: existing.title },
    })
  }

  return NextResponse.json({ document: doc })
})

export const DELETE = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user, profile } = await requireAuth()

  const { id } = await params
  const url = new URL(request.url)
  const isPermanent = url.searchParams.get("permanent") === "true"

  if (isPermanent && profile.role !== "dean") {
    return NextResponse.json({ error: "Only the Dean can permanently delete items" }, { status: 403 })
  }

  const adminClient = createAdminClient()

  const { data: doc } = await adminClient
    .from("documents")
    .select("id, title, folder_id, file_name")
    .eq("id", id)
    .single()

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 })

  if (!isPermanent) {
    const canDel = await hasDocumentAction(adminClient, user.id, id, "delete")
    if (!canDel) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    if (doc.folder_id) {
      const locked = await isFolderLocked(adminClient, doc.folder_id)
      if (locked && !(await canBypassLock(adminClient, user.id))) {
        return NextResponse.json({ error: "The folder containing this document is locked" }, { status: 403 })
      }
    }

    const { error } = await adminClient
      .from("documents")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "delete_document",
      resource_type: "document",
      resource_id: id,
      details: { item: doc.title },
    })

    return NextResponse.json({ success: true })
  }

  // Must null out current_version_id before deleting versions (FK constraint)
  await adminClient
    .from("documents")
    .update({ current_version_id: null })
    .eq("id", id)

  const { data: versions } = await adminClient
    .from("document_versions")
    .select("file_path")
    .eq("document_id", id)

  if (versions && versions.length > 0) {
    const paths = versions.map((v) => v.file_path)
    await adminClient.storage.from("documents").remove(paths)
  }

  await adminClient.from("document_tags").delete().eq("document_id", id)
  await adminClient.from("document_versions").delete().eq("document_id", id)
  await adminClient.from("comments").delete().eq("document_id", id)
  await adminClient.from("permissions").delete().eq("document_id", id)
  await adminClient.from("notifications").delete().eq("resource_type", "document").eq("resource_id", id)

  const { error: deleteError } = await adminClient.from("documents").delete().eq("id", id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    action: "permanent_delete",
    resource_type: "document",
    resource_id: id,
    details: { title: doc.title, versions_deleted: versions?.length ?? 0 },
  })

  return NextResponse.json({ success: true })
})

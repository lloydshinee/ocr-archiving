import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { isFolderLocked, canBypassLock, hasDocumentAction } from "@/lib/permission-utils"
import { truncateFilename } from "@/lib/utils"

const TEXT_EXTRACTABLE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export const GET = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params
  const adminClient = createAdminClient()

  const { data: versions } = await adminClient
    .from("document_versions")
    .select("*, created_by_user:users!document_versions_created_by_fkey(full_name)")
    .eq("document_id", id)
    .order("version_number", { ascending: false })

  return NextResponse.json({ versions: versions ?? [] })
})

export const POST = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params
    const isReplace = new URL(request.url).searchParams.get("replace") === "true"

    const adminClient = createAdminClient()

    const { data: doc } = await adminClient
      .from("documents")
      .select("id, title, file_name, current_version_id, folder_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (doc.folder_id) {
      const locked = await isFolderLocked(adminClient, doc.folder_id)
      if (locked && !(await canBypassLock(adminClient, user.id))) {
        return NextResponse.json({ error: "The folder containing this document is locked" }, { status: 403 })
      }
    }

    const canEdit = await hasDocumentAction(adminClient, user.id, id, "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "You don't have permission to modify this document" }, { status: 403 })
    }

    if (isReplace) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return NextResponse.json({ error: "File is required" }, { status: 400 })
      }

      const fileName = truncateFilename(file.name)

      const { data: versions } = await adminClient
        .from("document_versions")
        .select("version_number")
        .eq("document_id", id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single()

      const nextVersion = (versions?.version_number ?? 0) + 1
      const storagePath = `${id}/v${nextVersion}-${fileName}`
      const bytes = await file.arrayBuffer()
      const buffer = new Uint8Array(bytes)

      const { error: uploadError } = await adminClient.storage
        .from("documents")
        .upload(storagePath, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
      }

      const { data: version } = await adminClient
        .from("document_versions")
        .insert({
          document_id: id,
          version_number: nextVersion,
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
          .update({
            current_version_id: version.id,
            file_name: fileName,
            file_size: file.size,
            file_type: file.type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)

        if (TEXT_EXTRACTABLE_TYPES.includes(file.type)) {
          await adminClient.from("ocr_jobs").insert({
            version_id: version.id,
            document_id: id,
            status: "pending",
          })
        }

        await adminClient.from("audit_logs").insert({
          user_id: user.id,
          action: "version_update",
          resource_type: "document",
          resource_id: id,
          details: { item: doc.title, new_version: nextVersion, file_name: fileName },
        })
      }

      return NextResponse.json({ version })
    }

    const { versionId } = await request.json()

    if (!versionId) {
      return NextResponse.json({ error: "Version ID is required" }, { status: 400 })
    }

    const { data: targetVersion } = await adminClient
      .from("document_versions")
      .select("*")
      .eq("id", versionId)
      .eq("document_id", id)
      .single()

    if (!targetVersion) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    const { data: allVersions } = await adminClient
      .from("document_versions")
      .select("version_number")
      .eq("document_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (allVersions?.version_number ?? 0) + 1
    const ext = targetVersion.file_path.split(".").pop() ?? ""
    const restoredPath = `${id}/v${nextVersion}-restored.${ext}`

    const { data: sourceFile, error: copyError } = await adminClient.storage
      .from("documents")
      .download(targetVersion.file_path)

    if (copyError || !sourceFile) {
      return NextResponse.json({ error: "Failed to read version file" }, { status: 500 })
    }

    await adminClient.storage
      .from("documents")
      .upload(restoredPath, sourceFile, {
        contentType: targetVersion.file_type,
        cacheControl: "3600",
        upsert: false,
      })

    const { data: restoredVersion } = await adminClient
      .from("document_versions")
      .insert({
        document_id: id,
        version_number: nextVersion,
        file_path: restoredPath,
        file_size: targetVersion.file_size,
        file_type: targetVersion.file_type,
        created_by: user.id,
      })
      .select()
      .single()

    if (restoredVersion) {
      await adminClient
        .from("documents")
        .update({
          current_version_id: restoredVersion.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (TEXT_EXTRACTABLE_TYPES.includes(targetVersion.file_type)) {
        await adminClient.from("ocr_jobs").insert({
          version_id: restoredVersion.id,
          document_id: id,
          status: "pending",
        })
      }
    }

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "restore_version",
      resource_type: "document",
      resource_id: id,
      details: {
        restored_from_version: targetVersion.version_number,
        new_version: nextVersion,
      },
    })

    return NextResponse.json({ version: restoredVersion })
})

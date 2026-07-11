import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/admin-client"
import { requireAuth, withErrorHandling } from "@/lib/auth"
import { hasFolderAction } from "@/lib/permission-utils"

async function createArchiver() {
  const mod = await import("archiver")
  return new mod.ZipArchive({ zlib: { level: 6 } })
}

export const GET = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { user } = await requireAuth()

  const { id } = await params

  const adminClient = createAdminClient()

  const canView = await hasFolderAction(adminClient, user.id, id, "view")
  if (!canView) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { data: folder } = await adminClient
      .from("folders")
      .select("name")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 })

    const docEntries: { path: string; filePath: string }[] = []
    await collectDocuments(adminClient, id, folder.name, docEntries)

    if (docEntries.length === 0) {
      return NextResponse.json({ error: "No documents in this folder" }, { status: 400 })
    }

    const files: { name: string; buffer: Buffer }[] = await Promise.all(
      docEntries.map(async (entry) => {
        const { data, error } = await adminClient.storage
          .from("documents")
          .download(entry.filePath)
        if (error || !data) {
          return {
            name: `${entry.path}.error.txt`,
            buffer: Buffer.from(`Failed to download: ${error?.message ?? "unknown"}`),
          }
        }
        return { name: entry.path, buffer: Buffer.from(await data.arrayBuffer()) }
      }),
    )

    const archive = await createArchiver()

    const readable = new ReadableStream({
      start(controller) {

        archive.on("data", (chunk: Buffer) => controller.enqueue(chunk))
        archive.on("end", () => controller.close())
        archive.on("error", (err: Error) => controller.error(err))

        for (const file of files) {
          archive.append(file.buffer, { name: file.name })
        }

        archive.finalize()
      },
    })

    const safeName = folder.name.replace(/[^a-zA-Z0-9_-]/g, "_")

    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}.zip"`,
      },
    })
})

async function collectDocuments(
  adminClient: ReturnType<typeof createAdminClient>,
  folderId: string,
  prefix: string,
  entries: { path: string; filePath: string }[],
) {
  const { data: docs } = await adminClient
    .from("documents")
    .select("id, file_name, current_version_id")
    .eq("folder_id", folderId)
    .is("deleted_at", null)

  if (docs) {
    const versionIds = docs
      .map((d) => d.current_version_id)
      .filter((id): id is string => id !== null)

    const versionMap = new Map<string, string>()
    if (versionIds.length > 0) {
      const { data: versions } = await adminClient
        .from("document_versions")
        .select("id, file_path")
        .in("id", versionIds)

      if (versions) {
        for (const v of versions) {
          versionMap.set(v.id, v.file_path)
        }
      }
    }

    for (const doc of docs) {
      const filePath = doc.current_version_id ? versionMap.get(doc.current_version_id) : null
      if (filePath) {
        entries.push({
          path: `${prefix}/${doc.file_name}`,
          filePath,
        })
      }
    }
  }

  const { data: subfolders } = await adminClient
    .from("folders")
    .select("id, name")
    .eq("parent_id", folderId)
    .is("deleted_at", null)

  if (subfolders) {
    for (const sub of subfolders) {
      await collectDocuments(adminClient, sub.id, `${prefix}/${sub.name}`, entries)
    }
  }
}

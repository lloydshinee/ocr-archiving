interface FileEntry {
  relativePath: string[]
  file: File
}

function walkEntry(entry: FileSystemEntry, parentPath: string[] = []): Promise<FileEntry[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      const fe = entry as FileSystemFileEntry
      fe.file(
        (file) => resolve([{ relativePath: parentPath, file }]),
        () => resolve([]),
      )
    } else if (entry.isDirectory) {
      const de = entry as FileSystemDirectoryEntry
      de.createReader().readEntries(
        (children) => {
          const dirName = entry.name
          Promise.all(
            children.map((c) => walkEntry(c, [...parentPath, dirName])),
          ).then((nested) => resolve(nested.flat()), reject)
        },
        () => resolve([]),
      )
    } else {
      resolve([])
    }
  })
}

export async function collectEntries(items: DataTransferItemList): Promise<FileEntry[]> {
  const entries = Array.from(items)
    .map((item) => item.webkitGetAsEntry())
    .filter(Boolean) as FileSystemEntry[]

  const results = await Promise.all(entries.map((e) => walkEntry(e)))
  return results.flat()
}

export async function createFolderTree(
  entries: FileEntry[],
  parentFolderId: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  const folderPaths = new Set<string>()

  for (const { relativePath } of entries) {
    if (relativePath.length === 0) continue
    for (let i = 0; i < relativePath.length; i++) {
      folderPaths.add(relativePath.slice(0, i + 1).join("/"))
    }
  }

  const sorted = Array.from(folderPaths).sort((a, b) => a.split("/").length - b.split("/").length)

  const pathMap = new Map<string, string>()

  for (const path of sorted) {
    const parts = path.split("/")
    const name = parts[parts.length - 1]
    const parentPath = parts.slice(0, -1).join("/")
    const parentId = parentPath ? pathMap.get(parentPath) : parentFolderId

    if (!parentId) continue

    onProgress(`Creating folder "${name}"...`)

    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? `Failed to create folder "${name}"`)
    }

    const result = await res.json()
    pathMap.set(path, result.folder.id)
  }

  const filesByFolder = new Map<string, File[]>()
  for (const { relativePath, file } of entries) {
    if (relativePath.length === 0) {
      const existing = filesByFolder.get("__root__") ?? []
      existing.push(file)
      filesByFolder.set("__root__", existing)
    } else {
      const folderKey = relativePath.join("/")
      const folderId = pathMap.get(folderKey)
      if (!folderId) continue
      const existing = filesByFolder.get(folderId) ?? []
      existing.push(file)
      filesByFolder.set(folderId, existing)
    }
  }

  for (const [folderId, files] of filesByFolder) {
    if (files.length === 0) continue

    onProgress(`Uploading ${files.length} files...`)

    const formData = new FormData()
    formData.append("folderId", folderId === "__root__" ? parentFolderId : folderId)
    for (const file of files) {
      formData.append("files", file)
    }

    const res = await fetch("/api/documents/bulk", {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "Upload failed")
    }
  }
}

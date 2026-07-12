import { toast } from "sonner"

interface BatchItem {
  type: "folder" | "document"
  id: string
  name: string
}

export async function batchArchive(items: BatchItem[], currentlyArchived: boolean) {
  const results = await Promise.allSettled(
    items.map((item) =>
      fetch(
        item.type === "folder"
          ? `/api/folders/${item.id}/archive`
          : `/api/documents/${item.id}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archive: !currentlyArchived }),
        },
      ),
    ),
  )

  const succeeded = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok).length
  const failed = results.length - succeeded

  if (failed === 0) {
    toast.success(`${succeeded} item${succeeded !== 1 ? "s" : ""} ${currentlyArchived ? "unarchived" : "archived"}`)
  } else {
    toast.success(`${succeeded} ${currentlyArchived ? "unarchived" : "archived"}, ${failed} failed`)
  }
}

export async function batchDelete(items: BatchItem[]) {
  const results = await Promise.allSettled(
    items.map((item) =>
      fetch(
        item.type === "folder"
          ? `/api/folders/${item.id}`
          : `/api/documents/${item.id}`,
        { method: "DELETE" },
      ),
    ),
  )

  const succeeded = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok).length
  const failed = results.length - succeeded

  if (failed === 0) {
    toast.success(`${succeeded} item${succeeded !== 1 ? "s" : ""} moved to Recycle Bin`)
  } else {
    toast.success(`${succeeded} moved to Bin, ${failed} failed`)
  }
}

export async function batchMove(items: BatchItem[], targetId: string | null) {
  const results = await Promise.allSettled(
    items.map((item) =>
      fetch(
        item.type === "folder"
          ? `/api/folders/${item.id}`
          : `/api/documents/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            item.type === "folder"
              ? { parentId: targetId }
              : { folderId: targetId },
          ),
        },
      ),
    ),
  )

  const succeeded = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok).length
  const failed = results.length - succeeded

  if (failed === 0) {
    toast.success(`${succeeded} item${succeeded !== 1 ? "s" : ""} moved`)
  } else {
    toast.success(`${succeeded} moved, ${failed} failed`)
  }
}

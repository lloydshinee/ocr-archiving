import { describe, it, expect, vi } from "vitest"
import { mockClient } from "./helpers"

describe("walkFolderAncestry", () => {
  it("returns the folder itself when it has no parent", async () => {
    const { walkFolderAncestry } = await import("@/lib/folder-utils")
    const client = mockClient({
      folders: [{ id: "f1", parent_id: null, name: "Root", inherit_permissions: true, is_locked: false, deleted_at: null }],
    })
    const result = await walkFolderAncestry(client, "f1")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("f1")
  })

  it("walks up the parent chain in bottom-up order", async () => {
    const { walkFolderAncestry } = await import("@/lib/folder-utils")
    const rows = [
      { id: "child", parent_id: "parent", name: "Child", inherit_permissions: true, is_locked: false, deleted_at: null },
      { id: "parent", parent_id: "grandparent", name: "Parent", inherit_permissions: true, is_locked: false, deleted_at: null },
      { id: "grandparent", parent_id: null, name: "Grandparent", inherit_permissions: false, is_locked: false, deleted_at: null },
    ]
    const chain: any[] = []
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            single: vi.fn(() => {
              const row = rows.find((r) => r.id === val) ?? null
              return Promise.resolve({ data: row, error: null })
            }),
            is: vi.fn(() => ({
              single: vi.fn(() => {
                const row = rows.find((r) => r.id === val) ?? null
                return Promise.resolve({ data: row, error: null })
              }),
            })),
          })),
        })),
      })),
    } as any
    const result = await walkFolderAncestry(client, "child")
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe("child")
    expect(result[1].id).toBe("parent")
    expect(result[2].id).toBe("grandparent")
  })

  it("stops when a folder is not found", async () => {
    const { walkFolderAncestry } = await import("@/lib/folder-utils")
    const rows = [
      { id: "child", parent_id: "parent", name: "Child", inherit_permissions: true, is_locked: false, deleted_at: null },
    ]
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            single: vi.fn(() => {
              const row = rows.find((r) => r.id === val) ?? null
              return Promise.resolve({ data: row, error: null })
            }),
          })),
        })),
      })),
    } as any
    const result = await walkFolderAncestry(client, "child")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("child")
  })

  it("returns empty array for non-existent folder", async () => {
    const { walkFolderAncestry } = await import("@/lib/folder-utils")
    const client = mockClient({ folders: [] })
    const result = await walkFolderAncestry(client, "nonexistent")
    expect(result).toEqual([])
  })
})

describe("collectDescendantIds", () => {
  it("includes the folder itself and leaf children", async () => {
    const { collectDescendantIds } = await import("@/lib/folder-utils")
    const client = mockClient({
      folders: [
        { id: "root", parent_id: null },
        { id: "child1", parent_id: "root" },
        { id: "child2", parent_id: "root" },
        { id: "grandchild", parent_id: "child2" },
      ],
    })
    const result = await collectDescendantIds(client, "root")
    expect(result).toEqual(expect.arrayContaining(["root", "child1", "child2", "grandchild"]))
    expect(result).toHaveLength(4)
  })

  it("includes the root of a single-folder tree", async () => {
    const { collectDescendantIds } = await import("@/lib/folder-utils")
    const client = mockClient({
      folders: [{ id: "f1", parent_id: null }],
    })
    const result = await collectDescendantIds(client, "f1")
    expect(result).toEqual(["f1"])
  })

  it("excludeDeleted filters out deleted children", async () => {
    const { collectDescendantIds } = await import("@/lib/folder-utils")
    const client = mockClient({
      folders: [
        { id: "root", parent_id: null },
        { id: "child1", parent_id: "root", deleted_at: "2026-07-01" },
        { id: "grandchild", parent_id: "child1" },
      ],
    })
    const result = await collectDescendantIds(client, "root", { excludeDeleted: true })
    expect(result).toEqual(["root"])
  })

  it("starting folder is always included regardless of excludeDeleted", async () => {
    const { collectDescendantIds } = await import("@/lib/folder-utils")
    const client = mockClient({
      folders: [
        { id: "sole", parent_id: null, deleted_at: "2026-07-01" },
      ],
    })
    const result = await collectDescendantIds(client, "sole", { excludeDeleted: true })
    expect(result).toEqual(["sole"])
  })
})

describe("getFolderBreadcrumbsFromDb", () => {
  it("returns breadcrumbs from root to folder", async () => {
    const { getFolderBreadcrumbsFromDb } = await import("@/lib/folder-utils")
    const rows = [
      { id: "child", parent_id: "parent", name: "Child", inherit_permissions: true, is_locked: false, deleted_at: null },
      { id: "parent", parent_id: null, name: "Parent", inherit_permissions: true, is_locked: false, deleted_at: null },
    ]
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            single: vi.fn(() => {
              const row = rows.find((r) => r.id === val) ?? null
              return Promise.resolve({ data: row, error: null })
            }),
          })),
        })),
      })),
    } as any
    const result = await getFolderBreadcrumbsFromDb(client, "child")
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("parent")
    expect(result[0].name).toBe("Parent")
    expect(result[1].id).toBe("child")
    expect(result[1].name).toBe("Child")
  })

  it("skips deleted ancestors but includes non-deleted ancestors above them", async () => {
    const { getFolderBreadcrumbsFromDb } = await import("@/lib/folder-utils")
    const rows = [
      { id: "child", parent_id: "parent", name: "Child", inherit_permissions: true, is_locked: false, deleted_at: null },
      { id: "parent", parent_id: "grandparent", name: "Parent", inherit_permissions: true, is_locked: false, deleted_at: "2026-07-01" },
      { id: "grandparent", parent_id: null, name: "Grandparent", inherit_permissions: true, is_locked: false, deleted_at: null },
    ]
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            single: vi.fn(() => {
              const row = rows.find((r) => r.id === val) ?? null
              return Promise.resolve({ data: row, error: null })
            }),
          })),
        })),
      })),
    } as any
    const result = await getFolderBreadcrumbsFromDb(client, "child")
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("grandparent")
    expect(result[1].id).toBe("child")
  })
})

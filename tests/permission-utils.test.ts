import { describe, it, expect, vi } from "vitest"
import { mockClient, genericChain } from "./helpers"

async function importModule() {
  const mod = await import("@/lib/permission-utils")
  return mod
}

describe("hasFolderAction", () => {
  it("returns true for dean role", async () => {
    const { hasFolderAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "dean", program_id: null, full_name: "Dean" }],
    })
    const result = await hasFolderAction(client, "u1", "f1", "view")
    expect(result).toBe(true)
  })

  it("returns true for folder owner", async () => {
    const { hasFolderAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "Faculty" }],
      folders: [{ id: "f1", owner_id: "u1", program_id: null, inherit_permissions: true, parent_id: null }],
    })
    const result = await hasFolderAction(client, "u1", "f1", "view")
    expect(result).toBe(true)
  })

  it("returns true for program_head with matching program", async () => {
    const { hasFolderAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "program_head", program_id: "p1", full_name: "PH" }],
      folders: [{ id: "f1", owner_id: "u2", program_id: "p1", inherit_permissions: true, parent_id: null }],
    })
    const result = await hasFolderAction(client, "u1", "f1", "view")
    expect(result).toBe(true)
  })

  it("returns true when permission exists with the action", async () => {
    const { hasFolderAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      folders: [{ id: "f1", owner_id: "u2", program_id: null, inherit_permissions: false, parent_id: null }],
      permissions: [{ folder_id: "f1", user_id: "u1", actions: ["view", "create"] }],
    })
    const result = await hasFolderAction(client, "u1", "f1", "view")
    expect(result).toBe(true)
  })

  it("returns false when permission lacks the action", async () => {
    const { hasFolderAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      folders: [{ id: "f1", owner_id: "u2", program_id: null, inherit_permissions: false, parent_id: null }],
      permissions: [{ folder_id: "f1", user_id: "u1", actions: ["view"] }],
    })
    const result = await hasFolderAction(client, "u1", "f1", "delete")
    expect(result).toBe(false)
  })

  it("returns false when no permission exists", async () => {
    const { hasFolderAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      folders: [{ id: "f1", owner_id: "u2", program_id: null, inherit_permissions: false, parent_id: null }],
      permissions: [],
    })
    const result = await hasFolderAction(client, "u1", "f1", "view")
    expect(result).toBe(false)
  })

  it("returns true when permission exists on a subfolder with inheritance on", async () => {
    const { hasFolderAction } = await importModule()
    const folderRows = [
      { id: "parent", owner_id: "dean", program_id: null, inherit_permissions: true, parent_id: null, name: "Parent", is_locked: false, deleted_at: null },
      { id: "sub", owner_id: "dean", program_id: null, inherit_permissions: true, parent_id: "parent", name: "Sub", is_locked: false, deleted_at: null },
    ]
    const client = {
      from: vi.fn((table: string) => {
        if (table === "folders") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((_col: string, val: string) => ({
                single: vi.fn(() => {
                  const row = folderRows.find((r) => r.id === val) ?? null
                  return Promise.resolve({ data: row, error: null })
                }),
              })),
            })),
          }
        }
        if (table === "permissions") {
          const rows = [{ folder_id: "sub", user_id: "sa", actions: ["view"] }]
          const base = genericChain(rows)
          return { select: vi.fn(() => genericChain(rows)) }
        }
        if (table === "users") {
          const rows = [{ id: "sa", role: "student_assistant", program_id: null, full_name: "SA" }]
          return { select: vi.fn(() => genericChain(rows)) }
        }
        return { select: vi.fn(() => genericChain([])) }
      }),
    } as any
    const result = await hasFolderAction(client, "sa", "sub", "view")
    expect(result).toBe(true)
  })

  it("returns false for parent folder when permission is only on subfolder", async () => {
    const { hasFolderAction } = await importModule()
    const folderRows = [
      { id: "parent", owner_id: "dean", program_id: null, inherit_permissions: true, parent_id: null, name: "Parent", is_locked: false, deleted_at: null },
      { id: "sub", owner_id: "dean", program_id: null, inherit_permissions: true, parent_id: "parent", name: "Sub", is_locked: false, deleted_at: null },
    ]
    const client = {
      from: vi.fn((table: string) => {
        if (table === "folders") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((_col: string, val: string) => ({
                single: vi.fn(() => {
                  const row = folderRows.find((r) => r.id === val) ?? null
                  return Promise.resolve({ data: row, error: null })
                }),
              })),
            })),
          }
        }
        if (table === "permissions") {
          const rows = [{ folder_id: "sub", user_id: "sa", actions: ["view"] }]
          return { select: vi.fn(() => genericChain(rows)) }
        }
        if (table === "users") {
          const rows = [{ id: "sa", role: "student_assistant", program_id: null, full_name: "SA" }]
          return { select: vi.fn(() => genericChain(rows)) }
        }
        return { select: vi.fn(() => genericChain([])) }
      }),
    } as any
    const result = await hasFolderAction(client, "sa", "parent", "view")
    expect(result).toBe(false)
  })
})

describe("hasDocumentAction", () => {
  it("returns true for dean role", async () => {
    const { hasDocumentAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "dean", program_id: null, full_name: "Dean" }],
    })
    const result = await hasDocumentAction(client, "u1", "d1", "view")
    expect(result).toBe(true)
  })

  it("returns true for document owner", async () => {
    const { hasDocumentAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      documents: [{ id: "d1", folder_id: null, owner_id: "u1", category_id: null }],
    })
    const result = await hasDocumentAction(client, "u1", "d1", "edit")
    expect(result).toBe(true)
  })

  it("returns true when document permission exists", async () => {
    const { hasDocumentAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      documents: [{ id: "d1", folder_id: null, owner_id: "u2", category_id: null }],
      permissions: [{ document_id: "d1", user_id: "u1", actions: ["view"] }],
    })
    const result = await hasDocumentAction(client, "u1", "d1", "view")
    expect(result).toBe(true)
  })

  it("falls back to folder permission when no direct document permission", async () => {
    const { hasDocumentAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      documents: [{ id: "d1", folder_id: "f1", owner_id: "u2", category_id: null }],
      folders: [{ id: "f1", owner_id: "u1", program_id: null, inherit_permissions: false, parent_id: null }],
      permissions: [{ document_id: "d1", user_id: "u1", actions: [] }],
    })
    const result = await hasDocumentAction(client, "u1", "d1", "view")
    expect(result).toBe(true)
  })

  it("returns false for no permissions at all", async () => {
    const { hasDocumentAction } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      documents: [{ id: "d1", folder_id: null, owner_id: "u2", category_id: null }],
      permissions: [],
    })
    const result = await hasDocumentAction(client, "u1", "d1", "delete")
    expect(result).toBe(false)
  })
})

describe("resolvePermissionFolder", () => {
  it("returns the folder id when inherit_permissions is false", async () => {
    const { resolvePermissionFolder } = await importModule()
    const client = mockClient({
      folders: [{ id: "f1", inherit_permissions: false, parent_id: "parent" }],
    })
    const result = await resolvePermissionFolder(client, "f1")
    expect(result).toBe("f1")
  })

  it("walks up the parent chain until inherit_permissions is false", async () => {
    const { resolvePermissionFolder } = await importModule()
    const rows = [
      { id: "child", inherit_permissions: true, parent_id: "parent" },
      { id: "parent", inherit_permissions: true, parent_id: "grandparent" },
      { id: "grandparent", inherit_permissions: false, parent_id: null },
    ]
    const client = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            single: vi.fn(() => {
              const row = rows.find((r) => r.id === val)
              return Promise.resolve({ data: row ?? null, error: null })
            }),
          })),
        })),
      })),
    } as any
    const result = await resolvePermissionFolder(client, "child")
    expect(result).toBe("grandparent")
  })
})

describe("isFolderLocked", () => {
  it("returns false when no folder is locked", async () => {
    const { isFolderLocked } = await importModule()
    const client = mockClient({
      folders: [{ id: "f1", is_locked: false, parent_id: null }],
    })
    const result = await isFolderLocked(client, "f1")
    expect(result).toBe(false)
  })

  it("returns true when folder itself is locked", async () => {
    const { isFolderLocked } = await importModule()
    const client = mockClient({
      folders: [{ id: "f1", is_locked: true, parent_id: null }],
    })
    const result = await isFolderLocked(client, "f1")
    expect(result).toBe(true)
  })

  it("returns true when a parent folder is locked", async () => {
    const { isFolderLocked } = await importModule()
    const rows = [
      { id: "child", is_locked: false, parent_id: "parent" },
      { id: "parent", is_locked: true, parent_id: null },
    ]
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            single: vi.fn(() => {
              const row = rows.find((r) => r.id === val)
              return Promise.resolve({ data: row ?? null, error: null })
            }),
          })),
        })),
      })),
    } as any
    const result = await isFolderLocked(client, "child")
    expect(result).toBe(true)
  })
})

describe("canManagePermissions", () => {
  it("returns true for dean", async () => {
    const { canManagePermissions } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "dean", program_id: null, full_name: "Dean" }],
    })
    const result = await canManagePermissions(client, "u1", "f1")
    expect(result).toBe(true)
  })

  it("returns true for folder owner", async () => {
    const { canManagePermissions } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      folders: [{ id: "f1", owner_id: "u1", program_id: null }],
    })
    const result = await canManagePermissions(client, "u1", "f1")
    expect(result).toBe(true)
  })

  it("returns false for unauthorized user", async () => {
    const { canManagePermissions } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
      folders: [{ id: "f1", owner_id: "u2", program_id: null }],
    })
    const result = await canManagePermissions(client, "u1", "f1")
    expect(result).toBe(false)
  })
})

describe("canLockFolder", () => {
  it("returns true for dean", async () => {
    const { canLockFolder } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "dean", program_id: null, full_name: "Dean" }],
    })
    const result = await canLockFolder(client, "u1", "f1")
    expect(result).toBe(true)
  })

  it("returns true for program_head with matching program", async () => {
    const { canLockFolder } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "program_head", program_id: "p1", full_name: "PH" }],
      folders: [{ id: "f1", program_id: "p1" }],
    })
    const result = await canLockFolder(client, "u1", "f1")
    expect(result).toBe(true)
  })

  it("returns false for program_head with different program", async () => {
    const { canLockFolder } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "program_head", program_id: "p1", full_name: "PH" }],
      folders: [{ id: "f1", program_id: "p2" }],
    })
    const result = await canLockFolder(client, "u1", "f1")
    expect(result).toBe(false)
  })
})

describe("canBypassLock", () => {
  it("returns true for dean", async () => {
    const { canBypassLock } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "dean", program_id: null, full_name: "Dean" }],
    })
    const result = await canBypassLock(client, "u1")
    expect(result).toBe(true)
  })

  it("returns true for program_head", async () => {
    const { canBypassLock } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "program_head", program_id: "p1", full_name: "PH" }],
    })
    const result = await canBypassLock(client, "u1")
    expect(result).toBe(true)
  })

  it("returns false for faculty", async () => {
    const { canBypassLock } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: null, full_name: "F" }],
    })
    const result = await canBypassLock(client, "u1")
    expect(result).toBe(false)
  })
})

describe("getUserProfile", () => {
  it("returns profile for existing user", async () => {
    const { getUserProfile } = await importModule()
    const client = mockClient({
      users: [{ id: "u1", role: "faculty", program_id: "p1", full_name: "Test User" }],
    })
    const result = await getUserProfile(client, "u1")
    expect(result).not.toBeNull()
    expect(result?.role).toBe("faculty")
    expect(result?.program_id).toBe("p1")
    expect(result?.full_name).toBe("Test User")
  })

  it("returns null for non-existent user", async () => {
    const { getUserProfile } = await importModule()
    const client = mockClient({ users: [] })
    const result = await getUserProfile(client, "nonexistent")
    expect(result).toBeNull()
  })
})

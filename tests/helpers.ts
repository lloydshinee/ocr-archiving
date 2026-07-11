import { createClient } from "@supabase/supabase-js"
import { vi } from "vitest"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:8000"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

export function createAdminClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function result(data: any) {
  return Promise.resolve({ data, error: null })
}

export function genericChain(rows: any[]): any {
  return {
    eq: vi.fn((_col: string, val: string) => {
      const filtered = rows.filter((r: any) => r[_col] === val)
      return genericChain(filtered)
    }),
    single: vi.fn(() => result(rows[0] ?? null)),
    is: vi.fn(() => {
      const filtered = rows.filter((r: any) => r.deleted_at == null)
      return genericChain(filtered)
    }),
    in: vi.fn(() => genericChain(rows)),
    order: vi.fn(() => result(rows)),
    not: vi.fn(() => ({ order: vi.fn(() => result(rows)) })),
    then: (onfulfilled: any) => Promise.resolve({ data: rows, error: null }).then(onfulfilled),
  }
}

export function mockClient(stubs: Record<string, any>) {
  const db: Record<string, any[]> = {}
  for (const [table, rows] of Object.entries(stubs)) {
    db[table] = rows
  }

  return {
    from: vi.fn((table: string) => {
      const rows = db[table] ?? []
      return {
        select: vi.fn(() => genericChain(rows)),
      }
    }),
  } as any
}

export async function createTestUser(
  role: "dean" | "program_head" | "faculty" | "student_assistant",
  email?: string,
) {
  const admin = createAdminClient()
  const suffix = Math.random().toString(36).slice(2, 8)
  const testEmail = email ?? `test-${role}-${suffix}@ccs.edu`

  const { data, error } = await admin.auth.admin.createUser({
    email: testEmail,
    password: "testpass123",
    email_confirm: true,
    user_metadata: { full_name: `Test ${role}` },
  })

  if (error || !data?.user) {
    throw new Error(`Failed to create test user: ${error?.message}`)
  }

  await admin.from("users").update({ role, full_name: `Test ${role}` }).eq("id", data.user.id)

  return { id: data.user.id, email: testEmail, password: "testpass123", role }
}

export async function cleanupTestUser(userId: string) {
  const admin = createAdminClient()
  await admin.from("users").delete().eq("id", userId)
  await admin.auth.admin.deleteUser(userId)
}

export async function deleteAllTestUsers() {
  const admin = createAdminClient()
  const { data: users } = await admin.auth.admin.listUsers()
  const testUsers = users?.users?.filter((u) => u.email?.includes("test-")) ?? []
  for (const u of testUsers) {
    await admin.from("users").delete().eq("id", u.id)
    await admin.auth.admin.deleteUser(u.id)
  }
}

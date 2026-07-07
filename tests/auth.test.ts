import { describe, it, expect, afterAll } from "vitest"
import { createTestUser, cleanupTestUser, createAdminClient } from "./helpers"

describe("auth helpers", () => {
  const testUserIds: string[] = []

  afterAll(async () => {
    for (const id of testUserIds) {
      await cleanupTestUser(id)
    }
  })

  it("should create a test dean user", async () => {
    const user = await createTestUser("dean")
    testUserIds.push(user.id)

    expect(user.id).toBeTruthy()
    expect(user.email).toContain("test-dean")
    expect(user.role).toBe("dean")
  })

  it("should have the correct role in the database", async () => {
    const admin = createAdminClient()
    const user = await createTestUser("faculty")
    testUserIds.push(user.id)

    const { data: profile } = await admin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()

    expect(profile?.role).toBe("faculty")
    expect(profile?.email).toBe(user.email)
  })
})

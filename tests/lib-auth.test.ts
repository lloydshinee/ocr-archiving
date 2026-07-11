import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"

describe("AuthError", () => {
  it("should create an error with status code and message", async () => {
    const { AuthError } = await import("@/lib/auth")
    const error = new AuthError(401, "Unauthorized")
    expect(error).toBeInstanceOf(Error)
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe("Unauthorized")
    expect(error.name).toBe("AuthError")
  })
})

describe("requireAuth", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("should return user and profile when authenticated", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@ccs.edu" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "dean", program_id: null, full_name: "Test Dean" },
        }),
      }),
    }

    const { requireAuth } = await import("@/lib/auth")
    const result = await requireAuth(mockClient as any)

    expect(result.user.id).toBe("user-1")
    expect(result.profile.role).toBe("dean")
    expect(result.profile.program_id).toBeNull()
  })

  it("should throw AuthError(401) when no user", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
      from: vi.fn(),
    }

    const { requireAuth, AuthError } = await import("@/lib/auth")

    await expect(requireAuth(mockClient as any)).rejects.toThrow(AuthError)
    await expect(requireAuth(mockClient as any)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it("should throw AuthError(404) when profile not found", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
        }),
      }),
    }

    const { requireAuth, AuthError } = await import("@/lib/auth")

    await expect(requireAuth(mockClient as any)).rejects.toThrow(AuthError)
    await expect(requireAuth(mockClient as any)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe("withErrorHandling", () => {
  it("should return the handler response on success", async () => {
    const { withErrorHandling } = await import("@/lib/auth")
    const handler = withErrorHandling(async () => {
      return NextResponse.json({ ok: true })
    })

    const res = await handler(new Request("http://localhost:3000/test"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("should return 401 for AuthError", async () => {
    const { withErrorHandling, AuthError } = await import("@/lib/auth")
    const handler = withErrorHandling(async () => {
      throw new AuthError(401, "Unauthorized")
    })

    const res = await handler(new Request("http://localhost:3000/test"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("should return 404 for AuthError with 404", async () => {
    const { withErrorHandling, AuthError } = await import("@/lib/auth")
    const handler = withErrorHandling(async () => {
      throw new AuthError(404, "User profile not found")
    })

    const res = await handler(new Request("http://localhost:3000/test"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("User profile not found")
  })

  it("should return 500 and log for unknown errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { withErrorHandling } = await import("@/lib/auth")
    const handler = withErrorHandling(async () => {
      throw new Error("Something went wrong")
    })

    const res = await handler(new Request("http://localhost:3000/test"))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("Internal server error")
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

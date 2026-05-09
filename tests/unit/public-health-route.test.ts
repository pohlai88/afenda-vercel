import { afterEach, describe, expect, it, vi } from "vitest"

import { db } from "#lib/db"

vi.mock("#lib/db", () => ({
  db: {
    execute: vi.fn(),
  },
}))

describe("public health route", () => {
  afterEach(() => {
    vi.mocked(db.execute).mockReset()
  })

  it("returns a redacted ok response when dependencies are reachable", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [] } as never)
    const { GET } = await import("../../app/api/health/route")

    const response = await GET()
    const body = (await response.json()) as {
      ok: boolean
      checkedAt: string
      checks: Record<string, string>
    }

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.checkedAt).toEqual(expect.any(String))
    expect(body.checks).toEqual({
      app: "ok",
      database: "ok",
      runtime: "ok",
    })
    expect(JSON.stringify(body)).not.toMatch(
      /DATABASE_URL|postgres|neon|vercel|region|latency|stack/i
    )
  })

  it("returns a redacted 503 response when the database check fails", async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error("secret db detail"))
    const { GET } = await import("../../app/api/health/route")

    const response = await GET()
    const body = (await response.json()) as {
      ok: boolean
      checks: Record<string, string>
    }

    expect(response.status).toBe(503)
    expect(body).toMatchObject({
      ok: false,
      checks: {
        app: "ok",
        database: "error",
        runtime: "ok",
      },
    })
    expect(JSON.stringify(body)).not.toContain("secret db detail")
  })
})

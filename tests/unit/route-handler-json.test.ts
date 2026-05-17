import { describe, expect, it, vi } from "vitest"

import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
  routePublicErrorMessage,
  routeTextError,
} from "#lib/api/route-handler-json.shared"

describe("route-handler-json.shared", () => {
  it("routeJsonOk sets security headers and status", async () => {
    const res = routeJsonOk({ ok: true, n: 1 }, { status: 201 })
    expect(res.status).toBe(201)
    expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(await res.json()).toEqual({ ok: true, n: 1 })
  })

  it("routeJsonError includes optional code", async () => {
    const res = routeJsonError("Nope", 403, { code: "TEST" })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string; code?: string }
    expect(body.error).toBe("Nope")
    expect(body.code).toBe("TEST")
  })

  it("routeTextError sets plain text headers", () => {
    const res = routeTextError("Forbidden", 403)
    expect(res.status).toBe(403)
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })

  it("readRequestJson returns 400 on invalid JSON", async () => {
    const req = new Request("https://x.test/x", {
      method: "POST",
      body: "not-json{",
      headers: { "Content-Type": "application/json" },
    })
    const out = await readRequestJson(req)
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.response.status).toBe(400)
      expect(await out.response.json()).toEqual({ error: "Invalid JSON" })
    }
  })

  it("readRequestJson parses valid JSON", async () => {
    const req = new Request("https://x.test/x", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
      headers: { "Content-Type": "application/json" },
    })
    const out = await readRequestJson(req)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.value).toEqual({ a: 1 })
  })

  it("routePublicErrorMessage hides details in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(routePublicErrorMessage(new Error("secret"), "fallback")).toBe(
      "fallback"
    )
    vi.stubEnv("NODE_ENV", "development")
    expect(routePublicErrorMessage(new Error("secret"), "fallback")).toBe(
      "secret"
    )
    vi.unstubAllEnvs()
  })
})

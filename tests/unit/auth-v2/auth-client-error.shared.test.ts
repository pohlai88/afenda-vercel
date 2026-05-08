import { describe, expect, it } from "vitest"

import {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
} from "#lib/auth-v2/auth-client-error.shared"

describe("normalizeAuthClientError", () => {
  it("returns invalid credentials code", () => {
    const result = normalizeAuthClientError({ message: "Invalid credentials" })
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.INVALID_CREDENTIALS)
  })

  it("returns email unverified code", () => {
    const result = normalizeAuthClientError({ message: "Email is unverified" })
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.EMAIL_NOT_VERIFIED)
  })

  it("returns rate limited code by status", () => {
    const result = normalizeAuthClientError({
      status: 429,
      message: "Too many requests",
    })
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.RATE_LIMITED)
  })

  it("falls back to unknown", () => {
    const result = normalizeAuthClientError(null)
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.UNKNOWN)
  })
})

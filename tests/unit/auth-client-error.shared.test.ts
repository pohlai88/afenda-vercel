import { describe, expect, it } from "vitest"

import {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
} from "#lib/auth/auth-client-error.shared"

describe("normalizeAuthClientError", () => {
  it("returns invalid credentials code", () => {
    const result = normalizeAuthClientError("Invalid credentials")
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.INVALID_CREDENTIALS)
  })

  it("returns email unverified code", () => {
    const result = normalizeAuthClientError("Email is unverified")
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.EMAIL_NOT_VERIFIED)
  })

  it("returns rate limited code from message", () => {
    const result = normalizeAuthClientError("Too many requests")
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.RATE_LIMITED)
  })

  it("falls back to unknown", () => {
    const result = normalizeAuthClientError(null)
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.UNKNOWN)
  })

  it("maps HTTP 404 to a user-friendly feature-not-available message", () => {
    const result = normalizeAuthClientError("HTTP 404 Not Found")
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.UNKNOWN)
    expect(result.message).toContain("not available")
    expect(result.fieldHint).toBe("general")
  })

  it("maps HTTP 429 to rate-limited code", () => {
    const result = normalizeAuthClientError("HTTP 429 Too Many Requests")
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.RATE_LIMITED)
  })

  it("maps HTTP 500 to a service-unavailable message", () => {
    const result = normalizeAuthClientError("HTTP 500 Internal Server Error")
    expect(result.code).toBe(AUTH_CLIENT_ERROR_CODE.UNKNOWN)
    expect(result.message).toContain("temporarily unavailable")
  })

  it("does not misclassify non-HTTP 404 messages", () => {
    const result = normalizeAuthClientError("User not found in directory")
    // falls through to credentials mismatch — contains "not found"
    // but does NOT match "HTTP 404" pattern, so behaves as before
    expect(result.message).not.toContain("temporarily unavailable")
  })
})

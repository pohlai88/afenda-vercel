import { describe, expect, it } from "vitest"

import {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
} from "../../lib/auth/auth-client-error.shared"

describe("auth-client-error.shared", () => {
  it("normalizes empty or missing messages", () => {
    const n = normalizeAuthClientError(undefined)
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.UNKNOWN)
    expect(n.message).toBe("Something went wrong. Try again.")
    expect(normalizeAuthClientError("   ").message).toBe(
      "Something went wrong. Try again."
    )
  })

  it("classifies network failures", () => {
    const n = normalizeAuthClientError("TypeError: Failed to fetch")
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.NETWORK)
    expect(n.fieldHint).toBe("general")
  })

  it("classifies rate limits", () => {
    const n = normalizeAuthClientError("Too many requests, try later")
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.RATE_LIMITED)
  })

  it("classifies unverified email", () => {
    const n = normalizeAuthClientError("Email not verified")
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.EMAIL_NOT_VERIFIED)
    expect(n.fieldHint).toBe("email")
  })

  it("classifies invalid OTP", () => {
    const n = normalizeAuthClientError("Invalid OTP")
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.INVALID_OTP)
    expect(n.fieldHint).toBe("otp")
  })

  it("classifies bad credentials", () => {
    const n = normalizeAuthClientError("Invalid email or password")
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.INVALID_CREDENTIALS)
    expect(n.fieldHint).toBe("password")
  })

  it("classifies MFA / 2FA requirement", () => {
    const n = normalizeAuthClientError("Please enter your TOTP code")
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.MFA_REQUIRED)
    expect(n.fieldHint).toBe("general")
  })

  it("passes through unknown short messages", () => {
    const n = normalizeAuthClientError("Custom provider message")
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.UNKNOWN)
    expect(n.message).toBe("Custom provider message")
  })

  it("truncates very long unknown messages", () => {
    const long = "x".repeat(250)
    const n = normalizeAuthClientError(long)
    expect(n.code).toBe(AUTH_CLIENT_ERROR_CODE.UNKNOWN)
    expect(n.message.endsWith("…")).toBe(true)
    expect(n.message.length).toBeLessThanOrEqual(200)
  })
})

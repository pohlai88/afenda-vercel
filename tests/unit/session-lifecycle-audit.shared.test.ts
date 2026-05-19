import { describe, expect, it } from "vitest"

import {
  inferAuthMethodFromPath,
  normalizeAuthApiPath,
  resolveIamSessionLifecycleAudit,
} from "#lib/auth/session-lifecycle-audit.shared"

describe("session-lifecycle-audit.shared", () => {
  it("maps sign-in and sign-up auth API paths", () => {
    expect(resolveIamSessionLifecycleAudit("/sign-in/email")).toEqual({
      action: "iam.session.sign_in",
      method: "password",
    })
    expect(resolveIamSessionLifecycleAudit("/sign-up/email")).toEqual({
      action: "iam.session.sign_up",
      method: "sign_up_email",
    })
    expect(resolveIamSessionLifecycleAudit("/callback/google")).toEqual({
      action: "iam.session.sign_in",
      method: "oauth_callback",
    })
    expect(resolveIamSessionLifecycleAudit("/sign-out")).toBeNull()
  })

  it("normalizes /api/auth prefixes", () => {
    expect(normalizeAuthApiPath("/api/auth/sign-in/email")).toBe("/sign-in/email")
    expect(normalizeAuthApiPath("/api/auth")).toBe("/")
  })

  it("labels oauth callback paths distinctly", () => {
    expect(inferAuthMethodFromPath("/callback/github")).toBe("oauth_callback")
  })
})

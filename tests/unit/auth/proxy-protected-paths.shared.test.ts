import { describe, expect, it } from "vitest"

import {
  isOrgScopedLocaleInternalPath,
  isProtectedLocaleInternalPath,
  localeInternalSignInPathForProtectedRoute,
} from "#lib/auth/proxy-protected-paths.shared"

describe("proxy-protected-paths.shared", () => {
  describe("isProtectedLocaleInternalPath", () => {
    it("protects canonical /o prefix (resolver + all tenant paths)", () => {
      expect(isProtectedLocaleInternalPath("/o")).toBe(true)
      expect(isProtectedLocaleInternalPath("/o/acme")).toBe(true)
      expect(isProtectedLocaleInternalPath("/o/acme/dashboard")).toBe(true)
      expect(isProtectedLocaleInternalPath("/o/acme/dashboard/contacts")).toBe(
        true
      )
    })

    it("protects IAM and account surfaces", () => {
      expect(isProtectedLocaleInternalPath("/account/security")).toBe(true)
      expect(isProtectedLocaleInternalPath("/account")).toBe(true)
      expect(isProtectedLocaleInternalPath("/onboarding")).toBe(true)
      expect(isProtectedLocaleInternalPath("/accept-invitation")).toBe(true)
    })

    it("protects operator console", () => {
      expect(isProtectedLocaleInternalPath("/operator/users")).toBe(true)
    })

    it("does not protect public auth pages", () => {
      expect(isProtectedLocaleInternalPath("/sign-in")).toBe(false)
      expect(isProtectedLocaleInternalPath("/sign-up")).toBe(false)
      expect(isProtectedLocaleInternalPath("/forgot-password")).toBe(false)
      expect(isProtectedLocaleInternalPath("/reset-password")).toBe(false)
      expect(isProtectedLocaleInternalPath("/check-email")).toBe(false)
      expect(isProtectedLocaleInternalPath("/verify-email")).toBe(false)
      expect(isProtectedLocaleInternalPath("/session-expired")).toBe(false)
    })
  })

  describe("localeInternalSignInPathForProtectedRoute", () => {
    it("always returns /sign-in (single Neon Auth stack)", () => {
      expect(localeInternalSignInPathForProtectedRoute()).toBe("/sign-in")
    })
  })

  describe("org-scoped helpers", () => {
    it("isOrgScopedLocaleInternalPath matches slug root and children", () => {
      expect(isOrgScopedLocaleInternalPath("/o/acme-corp")).toBe(true)
      expect(isOrgScopedLocaleInternalPath("/o/acme-corp/admin")).toBe(true)
      expect(isOrgScopedLocaleInternalPath("/o")).toBe(false)
    })
  })
})

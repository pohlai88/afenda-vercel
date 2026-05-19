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
      expect(isProtectedLocaleInternalPath("/o/acme/apps/contacts")).toBe(true)
    })

    it("protects canonical /p portal prefix", () => {
      expect(isProtectedLocaleInternalPath("/p")).toBe(true)
      expect(isProtectedLocaleInternalPath("/p/acme-employee")).toBe(true)
      expect(isProtectedLocaleInternalPath("/p/acme-employee/employee")).toBe(
        true
      )
    })

    it("protects post-login org bootstrap and invitation surfaces", () => {
      expect(isProtectedLocaleInternalPath("/bootstrap")).toBe(true)
      expect(isProtectedLocaleInternalPath("/accept-invitation")).toBe(true)
    })

    it("protects org-scoped IAM profile under /o", () => {
      expect(
        isProtectedLocaleInternalPath("/o/acme/iam-profile/security")
      ).toBe(true)
    })

    it("protects platform console and legacy operator bookmarks", () => {
      expect(isProtectedLocaleInternalPath("/platform/users")).toBe(true)
      expect(isProtectedLocaleInternalPath("/operator/users")).toBe(true)
    })

    it("does not protect public auth pages or removed legacy alias roots", () => {
      expect(isProtectedLocaleInternalPath("/sign-in")).toBe(false)
      expect(isProtectedLocaleInternalPath("/sign-up")).toBe(false)
      expect(isProtectedLocaleInternalPath("/forgot-password")).toBe(false)
      expect(isProtectedLocaleInternalPath("/reset-password")).toBe(false)
      expect(isProtectedLocaleInternalPath("/check-email")).toBe(false)
      expect(isProtectedLocaleInternalPath("/verify-email")).toBe(false)
      expect(isProtectedLocaleInternalPath("/session-expired")).toBe(false)
      expect(isProtectedLocaleInternalPath("/account")).toBe(false)
      expect(isProtectedLocaleInternalPath("/iam-profile")).toBe(false)
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

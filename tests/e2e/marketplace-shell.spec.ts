import { expect, test } from "@playwright/test"

import { BOOTSTRAP_FIXTURE } from "../fixtures/bootstrap-mocks"

/**
 * Capability Registry — org-scoped marketplace proxy gate.
 *
 * Auth-gated proxy contract for legacy `/{locale}/o/{orgSlug}/marketplace/*` (308 → nexus after sign-in).
 * Mirrors `smoke.spec.ts`: unauthenticated users redirect to locale-prefixed
 * `/sign-in` with a `callbackUrl` preserving the full target path.
 */

const ORG_SLUG = BOOTSTRAP_FIXTURE.organization.slug

test.describe("marketplace shell — proxy gate", () => {
  test(
    "unauthenticated org marketplace redirects to sign-in with callbackUrl",
    { tag: "@smoke" },
    async ({ page }) => {
      const target = `/en/o/${ORG_SLUG}/marketplace`
      await page.goto(target)
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe(target)
    }
  )

  test(
    "unauthenticated org marketplace utilities redirects to sign-in with callbackUrl",
    { tag: "@smoke" },
    async ({ page }) => {
      const target = `/en/o/${ORG_SLUG}/marketplace/utilities`
      await page.goto(target)
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe(target)
    }
  )

  test(
    "unauthenticated org marketplace admin redirects to sign-in with callbackUrl",
    { tag: "@smoke" },
    async ({ page }) => {
      const target = `/en/o/${ORG_SLUG}/marketplace/admin`
      await page.goto(target)
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe(target)
    }
  )
})

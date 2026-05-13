import { expect, test } from "@playwright/test"

/**
 * Capability Registry — marketplace shell smoke.
 *
 * Auth-gated proxy contract for the new top-level `/marketplace` surface.
 * Mirrors `smoke.spec.ts` shape: the proxy must redirect unauthenticated
 * users to a locale-prefixed `/sign-in` with a `callbackUrl` that
 * preserves the full target path (including locale).
 *
 * Full toggle / policy flows (signed-in + admin step-up) require dev
 * credentials and live in a follow-up spec; @smoke covers the doors.
 */

test.describe("marketplace shell — proxy gate", () => {
  test(
    "unauthenticated /marketplace redirects to sign-in with callbackUrl",
    { tag: "@smoke" },
    async ({ page }) => {
      const target = "/en/marketplace"
      await page.goto(target)
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe(target)
    }
  )

  test(
    "unauthenticated /marketplace/utilities redirects to sign-in with callbackUrl",
    { tag: "@smoke" },
    async ({ page }) => {
      const target = "/en/marketplace/utilities"
      await page.goto(target)
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe(target)
    }
  )

  test(
    "unauthenticated /marketplace/admin redirects to sign-in with callbackUrl",
    { tag: "@smoke" },
    async ({ page }) => {
      const target = "/en/marketplace/admin"
      await page.goto(target)
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe(target)
    }
  )
})

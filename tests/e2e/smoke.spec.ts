import { expect, test } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

test.describe("public shell", () => {
  test(
    "organization audit redirects unauthenticated users to sign-in",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/account/organization/audit")
      await expect(page).toHaveURL(/\/en\/sign-in/)
    }
  )

  test(
    "dashboard redirects unauthenticated users to sign-in with locale-prefixed callbackUrl",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/dashboard")
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe("/en/dashboard")
    }
  )

  test(
    "org-scoped dashboard redirects unauthenticated users to sign-in with callbackUrl",
    { tag: "@smoke" },
    async ({ page }) => {
      const target = "/en/o/acme-corp/dashboard/contacts"
      await page.goto(target)
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe(target)
    }
  )

  test(
    "home renders and links to sign-in",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/")
      await expect(
        page.getByRole("heading", { name: DEMO_PUBLIC_COPY.homeHeading })
      ).toBeVisible()
      await page.getByRole("link", { name: "Sign in" }).click()
      await expect(page).toHaveURL(/\/en\/sign-in/)
      await expect(
        page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      ).toBeVisible()
    }
  )
})

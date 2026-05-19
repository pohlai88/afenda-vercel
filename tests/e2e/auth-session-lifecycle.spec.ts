import { expect, test, type Page } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

const ORG_SLUG_RE = /\/en\/o\/([^/]+)\/(?:apps|admin|nexus)/

async function resolveOrgSlug(page: Page): Promise<string | null> {
  if (orgSlugFromEnv) return orgSlugFromEnv

  const m = page.url().match(ORG_SLUG_RE)
  if (m) return m[1]

  await page.goto("/en/o")
  try {
    await page.waitForURL(ORG_SLUG_RE, { timeout: 15_000 })
  } catch {
    return null
  }
  const after = page.url().match(ORG_SLUG_RE)
  return after ? after[1] : null
}

test.describe("auth session lifecycle (sign-in → sign-out)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow."
      )
    }
  })

  test(
    "signed-in user reaches dashboard, signs out, home renders; protected route sends anonymous users to sign-in",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/sign-in")
      await expect(
        page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      ).toBeVisible()

      await page
        .getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
        .fill(orgAdminEmail!)
      await page.getByLabel("Password", { exact: true }).fill(orgAdminPassword!)
      await page.getByRole("button", { name: "Sign in", exact: true }).click()

      await page.waitForURL(/\/en\/(bootstrap|account|o)/, {
        timeout: 30_000,
      })

      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish setup at /bootstrap or /o."
      )

      await page.goto(`/en/o/${slug}/apps/contacts`)
      await expect(
        page.getByRole("heading", { name: "Dashboard", exact: true })
      ).toBeVisible({ timeout: 15_000 })

      await page.getByRole("button", { name: "Sign out" }).click()

      await expect(page).toHaveURL(/\/en\/?$/, { timeout: 15_000 })
      await expect(
        page.getByRole("heading", { name: DEMO_PUBLIC_COPY.homeHeading })
      ).toBeVisible()

      const accountTarget = "/en/account"
      await page.goto(accountTarget)
      await expect(page).toHaveURL(/\/en\/sign-in\?/)
      const u = new URL(page.url())
      expect(u.searchParams.get("callbackUrl")).toBe(accountTarget)
    }
  )
})

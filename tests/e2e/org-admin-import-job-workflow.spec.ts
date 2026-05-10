import { expect, test, type Page } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

const ORG_SLUG_RE = /\/en\/o\/([^/]+)\/(?:dashboard|admin)/

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

test.describe("org admin import job workflow (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD (org admin with verified email + step-up for workbench)."
      )
    }
  })

  test(
    "stage member-invite CSV, run job, durable workflow finishes completed",
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

      await page.waitForURL(/\/en\/(dashboard|console|account|o)/, {
        timeout: 30_000,
      })

      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug — set E2E_ORG_SLUG or finish setup at /console."
      )

      await page.goto(`/en/o/${slug}/admin/integrations`)
      await expect(
        page.getByRole("heading", { name: "Integrations", exact: true })
      ).toBeVisible({ timeout: 15_000 })

      const stamp = Date.now()
      const filename = `e2e-workflow-${stamp}.csv`
      const email = `e2e-import-${stamp}@example.com`

      await page
        .getByLabel("Filename (optional)", { exact: true })
        .fill(filename)
      await page
        .getByLabel("CSV body", { exact: true })
        .fill(`email,role\n${email},member`)

      await page.getByRole("button", { name: "Stage ingestion job" }).click()

      await expect(
        page.getByRole("alert").filter({ hasText: "Job staged" })
      ).toBeVisible({
        timeout: 30_000,
      })

      const row = page.locator("li").filter({ hasText: filename })
      await expect(row).toBeVisible({ timeout: 15_000 })

      await row.getByRole("button", { name: "Run", exact: true }).click()

      await expect(
        row.getByRole("button", { name: "Run", exact: true })
      ).toBeDisabled({ timeout: 30_000 })

      await expect
        .poll(
          async () => {
            await page.goto(`/en/o/${slug}/admin/integrations`, {
              waitUntil: "domcontentloaded",
            })
            const nextRow = page.locator("li").filter({ hasText: filename })
            if (!(await nextRow.isVisible())) return ""
            return (await nextRow.innerText()).replace(/\s+/g, " ").trim()
          },
          {
            timeout: 120_000,
            intervals: [500, 1000, 2000],
          }
        )
        .toMatch(/state:\s*completed/i)
    }
  )
})

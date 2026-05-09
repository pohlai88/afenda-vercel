import { expect, test } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

const ORG_SLUG_RE = /\/en\/o\/([^/]+)\/(?:dashboard|admin)/

async function resolveOrgSlug(
  page: import("@playwright/test").Page
): Promise<string | null> {
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

test.describe("org onething (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow."
      )
    }
  })

  test(
    "signed-in user creates a onething, completes it, audit shows completion",
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

      await page.waitForURL(/\/en\/(onboarding|account|o)/, {
        timeout: 30_000,
      })

      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      const title = `e2e-onething-${Date.now()}`
      await page.goto(`/en/o/${slug}/dashboard/onething`)
      await expect(
        page.getByRole("heading", { name: "OneThing", exact: true })
      ).toBeVisible({ timeout: 15_000 })

      // Capture row is keyboard-first — press `c` to open it, then fill + submit.
      // Click into the canvas first to ensure focus is not in another widget.
      await page
        .getByRole("region", { name: "OneThing list" })
        .first()
        .click({ position: { x: 4, y: 4 } })
      await page.keyboard.press("c")
      await page.getByPlaceholder("What needs to happen…").fill(title)
      await page.getByRole("button", { name: "Add task" }).click()

      // The new onething appears as the canvas (brand-new, top-ranked) or in the tail.
      const canvasArticle = page.getByRole("article", { name: title })
      const tailLink = page.getByRole("link").filter({ hasText: title }).first()
      await expect
        .poll(
          async () => (await canvasArticle.count()) + (await tailLink.count()),
          { timeout: 15_000 }
        )
        .toBeGreaterThan(0)

      if ((await canvasArticle.count()) === 0) {
        await tailLink.click()
      }
      await expect(canvasArticle).toBeVisible({ timeout: 15_000 })
      await canvasArticle.getByRole("button", { name: "Mark complete" }).click()

      await page.goto(`/en/o/${slug}/admin/audit`)
      await expect(
        page.getByRole("heading", { name: "Organization audit" })
      ).toBeVisible({ timeout: 15_000 })

      await expect(page.getByText("erp.onething.task.complete")).toBeVisible({
        timeout: 15_000,
      })
    }
  )
})

import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("nexus operational coordination (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow (org admin with active org)."
      )
    }
  })

  test(
    "org admin can enable coordination utility, create a context, and add text/file/screenshot evidence",
    { tag: "@orgAdmin" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish setup at /console."
      )

      await page.goto(`/en/o/${slug}/nexus`)
      await expect(
        page.getByRole("banner", { name: "Afenda workbench utility bar" })
      ).toBeVisible({ timeout: 15_000 })

      await page.goto(`/en/o/${slug}/nexus`)

      const coordinationCard = page.locator("li").filter({
        has: page.getByText("Operational coordination", { exact: true }),
      })
      const enableCoordination = coordinationCard.getByRole("button", {
        name: "Enable for me",
      })
      await expect(enableCoordination).toBeVisible({ timeout: 15_000 })
      await enableCoordination.click()

      await page.goto(`/en/o/${slug}/nexus`)
      await expect(
        page.getByRole("banner", { name: "Afenda workbench utility bar" })
      ).toBeVisible({ timeout: 15_000 })

      await page
        .getByRole("button", { name: "Coordination", exact: true })
        .click()
      await expect(
        page.getByRole("heading", {
          name: "Operational coordination",
          exact: true,
        })
      ).toBeVisible()

      await page
        .getByRole("button", { name: "New context", exact: true })
        .click()
      await page
        .getByLabel("Context title", { exact: true })
        .fill("E2E coordination context")
      await page.locator("button[aria-pressed]").nth(1).click()
      await page
        .getByRole("button", { name: "Create context", exact: true })
        .click()

      await expect(page.getByText("E2E coordination context")).toBeVisible()

      await page
        .getByLabel("Add coordination update", { exact: true })
        .fill("Need a reviewed decision trail for this test flow.")
      await page.locator('input[type="file"]').setInputFiles({
        name: "coordination-e2e.txt",
        mimeType: "application/pdf",
        buffer: Buffer.from("coordination evidence"),
      })
      await page
        .getByRole("button", { name: "Send update", exact: true })
        .click()
      await expect(
        page.getByText("Need a reviewed decision trail for this test flow.")
      ).toBeVisible()

      await page
        .getByRole("button", { name: "Attach screenshot", exact: true })
        .click()
      await page
        .getByRole("button", { name: "Send update", exact: true })
        .click()
      await expect(page.getByText(/screenshot/i)).toBeVisible()
    }
  )
})

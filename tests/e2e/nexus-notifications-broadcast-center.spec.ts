import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("nexus notifications broadcast center (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow (org admin with active org)."
      )
    }
  })

  test(
    "org admin can create, read, acknowledge, and close a broadcast notice",
    { tag: "@orgAdmin" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish setup at /console."
      )

      await page.goto(`/en/o/${slug}/nexus`)
      await expect(
        page.getByRole("banner", { name: "Afenda system utility bar" })
      ).toBeVisible({ timeout: 15_000 })

      await page
        .getByRole("button", { name: "Notifications", exact: true })
        .click()
      await expect(
        page.getByRole("heading", { name: "Notifications", exact: true })
      ).toBeVisible()

      await page
        .getByRole("button", { name: "New notice", exact: true })
        .click()
      await page
        .getByLabel("Title", { exact: true })
        .fill("E2E notice broadcast")
      await page
        .getByLabel("Body", { exact: true })
        .fill("This notice validates the Nexus broadcast flow.")
      await page
        .getByRole("button", { name: "Publish notice", exact: true })
        .click()

      await expect(page.getByText("E2E notice broadcast")).toBeVisible()

      await page.getByRole("button", { name: "Mark read", exact: true }).click()
      await expect(
        page.getByText("Read", { exact: true }).first()
      ).toBeVisible()

      await page
        .getByRole("button", { name: "Acknowledge", exact: true })
        .click()
      await expect(
        page.getByText("Acknowledged", { exact: true }).first()
      ).toBeVisible()

      await page
        .getByRole("button", { name: "Close notice", exact: true })
        .click()
      await expect(
        page.getByText("No active notices", { exact: true })
      ).toBeVisible()
    }
  )
})

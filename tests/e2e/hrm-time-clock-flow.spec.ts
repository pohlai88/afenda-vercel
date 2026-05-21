import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("HRM time clock UI surface", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "time clock page renders governed sections for the active org",
    { tag: ["@hrm", "@smoke"] },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/time-clock`)

      await expect(
        page.getByRole("heading", {
          name: "Time clock integration",
          exact: true,
        })
      ).toBeVisible()

      await expect(page.getByText("Overview", { exact: true })).toBeVisible()
      await expect(page.getByText("Devices", { exact: true })).toBeVisible()
      await expect(
        page.getByText("Employee mappings", { exact: true })
      ).toBeVisible()
      await expect(
        page.getByText("Punch exceptions", { exact: true })
      ).toBeVisible()

      await expect(
        page.locator('[data-testid="governed-list-section:hrm:time-clock:devices"]')
      ).toBeVisible()
    }
  )
})

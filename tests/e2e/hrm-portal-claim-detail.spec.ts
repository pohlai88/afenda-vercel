import { expect, test } from "./fixtures/auth"

import { assertNoSeriousAxeViolations } from "./utils/axe"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const portalSlug = process.env.E2E_EMPLOYEE_PORTAL_SLUG?.trim()

test.describe("HRM employee portal — claim detail", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD."
  )
  test.skip(
    !portalSlug,
    "Set E2E_EMPLOYEE_PORTAL_SLUG for portal claim detail."
  )

  test(
    "claims list links to detail with timeline and evidence sections",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(`/en/p/${portalSlug}/employee/claims`)

      const viewLink = page.getByRole("link", { name: "View" }).first()
      const hasClaim = await viewLink.isVisible().catch(() => false)
      test.skip(!hasClaim, "No claims seeded for portal employee.")

      await viewLink.click()

      await expect(
        page.getByRole("heading", { name: "Claim detail", exact: true })
      ).toBeVisible()
      await expect(page.getByText("Status")).toBeVisible()
      await expect(page.getByText("Evidence")).toBeVisible()
      await assertNoSeriousAxeViolations(page)
    }
  )
})

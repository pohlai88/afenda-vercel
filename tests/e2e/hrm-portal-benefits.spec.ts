import { expect, test } from "./fixtures/auth"

import { assertNoSeriousAxeViolations } from "./utils/axe"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const portalSlug = process.env.E2E_EMPLOYEE_PORTAL_SLUG?.trim()

test.describe("HRM employee portal — benefits", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD."
  )
  test.skip(
    !portalSlug,
    "Set E2E_EMPLOYEE_PORTAL_SLUG for portal benefits self-service."
  )

  test(
    "benefits portal renders coverage and enrollment sections",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(`/en/p/${portalSlug}/employee/benefits`)

      await expect(
        page.getByRole("heading", { name: "My benefits", exact: true })
      ).toBeVisible()
      await expect(page.getByText("Available plans")).toBeVisible()
      await expect(page.getByText("Current coverage")).toBeVisible()
      await assertNoSeriousAxeViolations(page)
    }
  )
})

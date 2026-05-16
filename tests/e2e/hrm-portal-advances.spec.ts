import { expect, test } from "./fixtures/auth"

import { assertNoSeriousAxeViolations } from "./utils/axe"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const portalSlug = process.env.E2E_EMPLOYEE_PORTAL_SLUG?.trim()

test.describe("HRM employee portal — salary advances", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD."
  )
  test.skip(
    !portalSlug,
    "Set E2E_EMPLOYEE_PORTAL_SLUG for portal advance self-service."
  )

  test(
    "advances portal renders request form and list",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(`/en/p/${portalSlug}/employee/advances`)

      await expect(
        page.getByRole("heading", {
          name: "My salary advances",
          exact: true,
        })
      ).toBeVisible()
      await expect(page.getByText("Request advance")).toBeVisible()
      await assertNoSeriousAxeViolations(page)
    }
  )
})

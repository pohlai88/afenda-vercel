import { expect, test } from "./fixtures/auth"

const portalSlug = process.env.E2E_EMPLOYEE_PORTAL_SLUG?.trim()
const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()

test.describe("@smoke HRM signature flow", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword || !portalSlug,
    "Set E2E_ORG_ADMIN_* and E2E_EMPLOYEE_PORTAL_SLUG for signature portal smoke."
  )

  test("signatures portal page renders", async ({ page }) => {
    await page.goto(`/en/p/${portalSlug}/employee/signatures`)
    await expect(
      page.getByRole("heading", { name: "My signatures", exact: true })
    ).toBeVisible()
  })
})

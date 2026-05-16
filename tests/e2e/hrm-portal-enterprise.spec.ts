import { expect, test } from "./fixtures/auth"

import { assertNoSeriousAxeViolations } from "./utils/axe"
import { expectEmployeePortalSection } from "./utils/portal-section"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const portalSlug = process.env.E2E_EMPLOYEE_PORTAL_SLUG?.trim()

test.describe("HRM employee portal enterprise hardening", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for portal flows."
  )
  test.skip(
    !portalSlug,
    "Set E2E_EMPLOYEE_PORTAL_SLUG to an employee portal the signed-in user can access."
  )

  const sections = [
    { path: "attendance", heading: "My attendance" },
    { path: "leave", heading: "My leave" },
    { path: "payslips", heading: "My payslips" },
    { path: "documents", heading: "My documents" },
    { path: "offboarding", heading: "My exit checklist" },
    { path: "performance", heading: "My performance" },
    { path: "training", heading: "My training" },
    { path: "profile/personal", heading: "Personal details" },
    { path: "profile/emergency", heading: "Emergency contact" },
  ] as const

  for (const { path, heading } of sections) {
    test(
      `${path} renders with accessibility gate`,
      { tag: "@hrm" },
      async ({ page }) => {
        await expectEmployeePortalSection(page, portalSlug!, path, heading)
      }
    )
  }

  test(
    "profile banking renders (@smoke Tier A)",
    { tag: ["@hrm", "@smoke"] },
    async ({ page }) => {
      await expectEmployeePortalSection(
        page,
        portalSlug!,
        "profile/banking",
        "Banking details"
      )
    }
  )

  test(
    "invalid employee section shows not-found copy",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(`/en/p/${portalSlug}/employee/not-a-real-section`)
      await expect(
        page.getByRole("heading", { name: "Employee section not found" })
      ).toBeVisible()
      await assertNoSeriousAxeViolations(page)
    }
  )
})

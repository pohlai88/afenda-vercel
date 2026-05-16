import { expect, test } from "./fixtures/auth"

import { assertNoSeriousAxeViolations } from "./utils/axe"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()

/**
 * Employee portal smoke — each HRM portal section renders its documented page title.
 *
 * Requires an authenticated user with active employee portal access for the slug
 * (typically the org owner linked as an employee subject). Set `E2E_EMPLOYEE_PORTAL_SLUG`
 * to the portal slug (e.g. `acme-employee`). When unset, tests skip so CI stays green
 * without portal seed data.
 */
const portalSlug = process.env.E2E_EMPLOYEE_PORTAL_SLUG?.trim()

test.describe("HRM employee portal sections", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for portal flows."
  )

  test.skip(
    !portalSlug,
    "Set E2E_EMPLOYEE_PORTAL_SLUG to an employee portal the signed-in user can access."
  )

  const sections = [
    { path: "leave", heading: "My leave" },
    { path: "payslips", heading: "My payslips" },
    { path: "advances", heading: "My salary advances" },
    { path: "claims", heading: "My claims" },
    { path: "benefits", heading: "My benefits" },
    { path: "training", heading: "My training" },
    { path: "attendance", heading: "My attendance" },
    { path: "documents", heading: "My documents" },
    { path: "signatures", heading: "My signatures" },
    { path: "profile", heading: "My profile" },
    { path: "performance", heading: "My performance" },
    { path: "offboarding", heading: "My exit checklist" },
  ] as const

  for (const { path, heading } of sections) {
    test(
      `${path} portal page renders primary heading`,
      { tag: "@hrm" },
      async ({ page }) => {
        await page.goto(`/en/p/${portalSlug}/employee/${path}`)

        await expect(
          page.getByRole("heading", { name: heading, exact: true })
        ).toBeVisible()
        await assertNoSeriousAxeViolations(page)
      }
    )
  }
})

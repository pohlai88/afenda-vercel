import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

/**
 * Focused operator flow for the HRM attendance surface.
 *
 * This covers the route contract plus one concrete admin mutation path:
 * pick an employee/date, record a clock-in, and verify the day summary
 * reflects payroll-blocking operational truth. The correction and
 * multi-day scenarios remain unit-covered so this browser test stays
 * stable across seeded orgs.
 */
test.describe("HRM attendance UI surface", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "attendance page renders the page header for the active org",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/dashboard/hrm/attendance`)

      await expect(
        page.getByRole("heading", {
          name: "Attendance management",
          exact: true,
        })
      ).toBeVisible()
    }
  )

  test(
    "attendance admin flow records an event and surfaces operational day status",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/dashboard/hrm/attendance`)

      await expect(page.getByText("Day summary", { exact: true })).toBeVisible()
      await expect(
        page.getByText("Recent events", { exact: true })
      ).toBeVisible()

      const summaryForm = page.locator(
        'form[action$="/dashboard/hrm/attendance"][method="get"]'
      )
      const employeeOptions = summaryForm.locator(
        'select[name="employeeId"] option'
      )
      const employeeOptionCount = await employeeOptions.count()
      test.skip(
        employeeOptionCount <= 1,
        "No active employees available for attendance mutation flow."
      )

      const futureDate = "2030-01-15"
      await summaryForm
        .locator('select[name="employeeId"]')
        .selectOption({ index: 1 })
      await summaryForm.locator('input[name="date"]').fill(futureDate)
      await summaryForm.getByRole("button", { name: "Show day" }).click()

      await page.getByRole("button", { name: "Record event" }).click()
      const dialog = page.getByRole("dialog")
      await dialog.locator('select[name="employeeId"]').selectOption({
        index: 1,
      })
      await dialog.locator('select[name="eventType"]').selectOption("clock_in")
      await dialog
        .locator('input[name="occurredAt"]')
        .fill(`${futureDate}T09:00`)
      await dialog.getByRole("button", { name: "Record event" }).click()

      await expect(dialog).not.toBeVisible()
      await expect(
        page.getByText("Payroll blocked", { exact: true })
      ).toBeVisible()
      await expect(
        page.getByText("First clock in", { exact: true })
      ).toBeVisible()

      await page.getByRole("button", { name: "Regenerate day" }).click()
      await expect(
        page.getByText("No changes — the day aggregate is already in sync with the raw events.", {
          exact: true,
        })
      ).toBeVisible()
    }
  )

  test(
    "attendance route under unknown org slug renders organization not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(
        "/en/o/zz-no-such-afenda-org-slug-99/dashboard/hrm/attendance"
      )
      await expect(
        page.getByRole("heading", {
          name: "Organization not available",
          exact: true,
        })
      ).toBeVisible()
    }
  )
})

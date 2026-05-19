import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"
import {
  HRM_PAYROLL_E2E_FIXTURE,
  hasHrmPayrollFixtureDatabase,
  readHrmPayrollE2eFixtureState,
  resetHrmPayrollE2eFixture,
  seedHrmPayrollE2eFixture,
} from "./utils/hrm-payroll-fixtures"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

/**
 * Smoke gate for the HRM payroll preparation surface.
 *
 * The route-level checks prove shell reachability and tenant boundaries. The
 * full-flow check below owns one deterministic employee/contract/profile
 * fixture, then uses the browser to exercise the real Server Actions:
 * create -> prepare -> certify -> lock.
 */
test.describe("HRM payroll preparation UI surface", () => {
  test.describe.configure({ mode: "serial" })

  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "payroll page renders the page header for the active org",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/payroll`, {
        waitUntil: "domcontentloaded",
      })

      await expect(
        page.getByRole("heading", {
          name: "Payroll preparation",
          exact: true,
        })
      ).toBeVisible()
      await expect(page.getByText("Open a payroll period")).toBeVisible()
    }
  )

  test(
    "payroll page exposes period creation fields and stable empty state",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/payroll`, {
        waitUntil: "domcontentloaded",
      })

      await expect(page.getByLabel("Period start (YYYY-MM-DD)")).toBeVisible()
      await expect(page.getByLabel("Period end (YYYY-MM-DD)")).toBeVisible()
      await expect(page.getByLabel("Cutoff date (YYYY-MM-DD)")).toBeVisible()
      await expect(page.getByLabel("Payment date (YYYY-MM-DD)")).toBeVisible()
      await expect(page.getByLabel("Payroll group code")).toBeVisible()
      await expect(page.getByLabel("Currency")).toHaveValue("MYR")

      const openPeriod = page.getByRole("button", {
        name: "Open period",
        exact: true,
      })
      await expect(openPeriod).toBeVisible()

      const noPeriods = page.getByText(
        "No payroll periods yet. Open the first period above.",
        { exact: true }
      )
      if (await noPeriods.isVisible()) {
        await expect(noPeriods).toBeVisible()
      } else {
        await expect(page.getByText("Traceability (7 questions)")).toBeVisible()
      }
    }
  )

  test(
    "payroll route under unknown org slug renders organization not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto("/en/o/zz-no-such-afenda-org-slug-99/apps/hrm/payroll")
      await expect(
        page.getByRole("heading", {
          name: "Organization not available",
          exact: true,
        })
      ).toBeVisible()
    }
  )

  test(
    "creates, prepares, certifies, and locks a seeded payroll period",
    { tag: "@hrm" },
    async ({ page }) => {
      test.setTimeout(120_000)
      test.skip(
        !hasHrmPayrollFixtureDatabase(),
        "Set DATABASE_URL for deterministic HRM payroll E2E fixtures."
      )

      await seedHrmPayrollE2eFixture()
      test.info().annotations.push({
        type: "fixture",
        description: HRM_PAYROLL_E2E_FIXTURE.employeeNumber,
      })

      try {
        const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
        test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

        await page.goto(`/en/o/${slug}/apps/hrm/payroll`, {
          waitUntil: "domcontentloaded",
        })

        await page
          .getByLabel("Period start (YYYY-MM-DD)")
          .fill(HRM_PAYROLL_E2E_FIXTURE.periodStart)
        await page
          .getByLabel("Period end (YYYY-MM-DD)")
          .fill(HRM_PAYROLL_E2E_FIXTURE.periodEnd)
        await page
          .getByLabel("Cutoff date (YYYY-MM-DD)")
          .fill(HRM_PAYROLL_E2E_FIXTURE.cutoffDate)
        await page
          .getByLabel("Payment date (YYYY-MM-DD)")
          .fill(HRM_PAYROLL_E2E_FIXTURE.paymentDate)
        await page
          .getByLabel("Payroll group code")
          .fill(HRM_PAYROLL_E2E_FIXTURE.payrollGroupCode)
        await page.getByLabel("Currency").fill("MYR")
        await page
          .getByRole("button", { name: "Open period", exact: true })
          .click()

        await expect(
          page.getByText("Period opened.", { exact: true })
        ).toBeVisible()

        await page.reload({ waitUntil: "domcontentloaded" })
        await expect(
          page.getByText(
            `${HRM_PAYROLL_E2E_FIXTURE.periodStart} - ${HRM_PAYROLL_E2E_FIXTURE.periodEnd}`,
            { exact: true }
          )
        ).toBeVisible()

        await page
          .getByRole("button", { name: "Prepare runs", exact: true })
          .click()

        await expect
          .poll(readHrmPayrollE2eFixtureState, {
            timeout: 60_000,
            message: "payroll workflow should compute the staged fixture run",
          })
          .toMatchObject({
            periodState: "preparing",
            runStates: ["computed"],
          })

        await page.goto(`/en/o/${slug}/apps/hrm/payroll`, {
          waitUntil: "domcontentloaded",
        })

        await expect(
          page.getByText(HRM_PAYROLL_E2E_FIXTURE.employeeLegalName, {
            exact: false,
          })
        ).toBeVisible()
        await expect(
          page.getByText(HRM_PAYROLL_E2E_FIXTURE.employeeNumber, {
            exact: false,
          })
        ).toBeVisible()

        await page
          .getByRole("button", {
            name: "Request lock certification",
            exact: true,
          })
          .click()

        await page.reload({ waitUntil: "domcontentloaded" })
        await expect(page.getByText("Pending lock certification")).toBeVisible()
        await page
          .getByRole("button", { name: "Approve certification", exact: true })
          .click()

        await expect
          .poll(readHrmPayrollE2eFixtureState, {
            timeout: 30_000,
            message: "payroll certification should be approved before lock",
          })
          .toMatchObject({ approvalStates: ["approved"] })

        await page.goto(`/en/o/${slug}/apps/hrm/payroll`, {
          waitUntil: "domcontentloaded",
        })

        await page
          .getByRole("button", { name: "Lock payroll period", exact: true })
          .click()

        await expect
          .poll(readHrmPayrollE2eFixtureState, {
            timeout: 30_000,
            message: "payroll period should lock after certification approval",
          })
          .toMatchObject({
            periodState: "locked",
            rulePackVersion: "MY-2026-01",
            runStates: ["locked"],
            approvalStates: ["approved"],
          })

        await page.reload({ waitUntil: "domcontentloaded" })
        await expect(page.getByText("Locked", { exact: true })).toBeVisible()
        await expect(page.getByText("Rule pack MY-2026-01")).toBeVisible()
      } finally {
        await resetHrmPayrollE2eFixture()
      }
    }
  )
})

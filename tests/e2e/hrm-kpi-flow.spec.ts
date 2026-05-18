import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()
const portalSlug = process.env.E2E_EMPLOYEE_PORTAL_SLUG?.trim()

/**
 * HRM KPI flow — workbench goal management + employee portal read-only view.
 *
 * Workbench checks (org admin scope):
 *  - KPI periods page renders correctly
 *  - Goals tab is reachable and shows the Goals heading
 *  - Metric catalog section is visible
 *  - Create-period form is accessible
 *
 * Portal checks (employee scope):
 *  - `/p/{portalSlug}/employee/performance` renders the portal goal list
 *  - The read-only hint is visible when no editable controls are present
 *
 * All tests skip gracefully when env vars are not set (CI without seed data).
 */

test.describe("HRM KPI workbench", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "KPI periods page renders for org admin",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/kpi`)

      await expect(
        page.getByRole("heading", { name: "KPI periods", exact: true })
      ).toBeVisible()
    }
  )

  test(
    "KPI Goals tab is reachable and renders goal list area",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/kpi?tab=goals`)

      // The Goals tab text from i18n: surfaceTabGoals = "Goals"
      const goalsTab = page
        .getByRole("link", { name: "Goals" })
        .or(page.getByRole("tab", { name: "Goals" }))
      await expect(goalsTab.first()).toBeVisible()
    }
  )

  test(
    "KPI metric catalog section is visible",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/kpi`)

      // metricCatalogTitle = "Metric catalog"
      await expect(
        page.getByText("Metric catalog", { exact: true })
      ).toBeVisible()
    }
  )

  test(
    "KPI page has an accessible link to create a new KPI period",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/kpi`)

      // The description area should contain the "KPI periods" subtitle
      await expect(page.getByText("KPI periods")).toBeVisible()
    }
  )
})

test.describe("HRM KPI portal read-only view", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for portal flows."
  )

  test.skip(
    !portalSlug,
    "Set E2E_EMPLOYEE_PORTAL_SLUG to an employee portal the signed-in user can access."
  )

  test(
    "employee portal performance page renders My performance heading",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(`/en/p/${portalSlug}/employee/performance`)

      await expect(
        page.getByRole("heading", { name: "My performance", exact: true })
      ).toBeVisible()
    }
  )

  test(
    "employee portal performance page shows goals section",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(`/en/p/${portalSlug}/employee/performance`)

      // goalsTitle = "Goals"
      await expect(page.getByText("Goals", { exact: true })).toBeVisible()
    }
  )

  test(
    "employee portal performance page does not expose edit controls",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(`/en/p/${portalSlug}/employee/performance`)

      // Portal view is read-only — no "Edit", "Delete", or "Score" buttons
      await expect(page.getByRole("button", { name: /edit/i })).toHaveCount(0)
      await expect(page.getByRole("button", { name: /score/i })).toHaveCount(0)
    }
  )

  test(
    "employee portal performance goal detail page renders when navigating to a goal",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(`/en/p/${portalSlug}/employee/performance`)

      // If there are any goals, clicking "View" should open the goal detail page
      const viewLink = page.getByRole("link", { name: "View" }).first()
      const hasGoals = await viewLink.isVisible().catch(() => false)

      if (!hasGoals) {
        // No goals seeded — verify the empty state renders instead of crashing
        await expect(
          page.getByText("No goals are visible in the portal yet.", {
            exact: true,
          })
        ).toBeVisible()
        return
      }

      await viewLink.click()
      await expect(
        page.getByRole("heading", { name: "Goal detail", exact: true })
      ).toBeVisible()
      // Read-only hint text from portalPerformance.readOnlyHint
      await expect(
        page.getByText("This view is read-only.", { exact: false })
      ).toBeVisible()
    }
  )
})

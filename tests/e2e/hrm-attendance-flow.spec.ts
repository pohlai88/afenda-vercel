import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

/**
 * Smoke gate for the HRM attendance surface (PR #2 — attendance UI binding).
 *
 * The full record -> correct -> regenerate round-trip is intentionally
 * out of scope here because it requires a seeded employee + active
 * employment contract per org, plus a deterministic clock to assert on
 * aggregator outputs. This spec proves the route is reachable, renders
 * the documented affordances, and respects tenant boundaries — i.e.
 * that the URL we just shipped does not 500 on prod-shaped builds.
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
    "attendance page exposes day summary + recent events sections",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/dashboard/hrm/attendance`)

      await expect(page.getByText("Day summary", { exact: true })).toBeVisible()
      await expect(
        page.getByText("Recent events", { exact: true })
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

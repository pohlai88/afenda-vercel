import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

/**
 * Smoke gate for the HRM leave surface (PR #1 — leave UI binding).
 *
 * The full apply -> approve round-trip is intentionally out of scope
 * here because it requires a seeded employee + active leave type per
 * org. This spec proves the route is reachable, renders the documented
 * affordances, and respects tenant boundaries — i.e. that the URL we
 * just shipped does not 500 on prod-shaped builds.
 */
test.describe("HRM leave UI surface", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "leave page renders the page header for the active org",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/leave`)

      await expect(
        page.getByRole("heading", { name: "Leave management", exact: true })
      ).toBeVisible()
    }
  )

  test(
    "leave page exposes pending approvals + recent activity sections",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/leave`)

      await expect(page.getByText("Pending approvals")).toBeVisible()
      await expect(page.getByText("Recent activity")).toBeVisible()
    }
  )

  test(
    "leave route under unknown org slug renders organization not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto("/en/o/zz-no-such-afenda-org-slug-99/apps/hrm/leave")
      await expect(
        page.getByRole("heading", {
          name: "Organization not available",
          exact: true,
        })
      ).toBeVisible()
    }
  )
})

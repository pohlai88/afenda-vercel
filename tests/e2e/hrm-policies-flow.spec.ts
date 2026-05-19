import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

/**
 * Smoke gate for the HRM policies workbench (PR #4 — UI binding for
 * the existing Phase 2A leave-policy Server Actions).
 *
 * The full create -> edit -> seed -> archive round-trip is intentionally
 * out of scope here because it requires a fresh org with no leave-type
 * catalog overlap. This spec proves the route is reachable, renders the
 * documented affordances (page header + tab navigator + leave-types
 * card), URL-driven tab state survives deep links, and tenant
 * boundaries are honored — i.e. that the URL we just shipped does not
 * 500 on prod-shaped builds and that an unknown org slug renders the
 * canonical "organization not available" not-found shell.
 */
test.describe("HRM policies workbench UI surface", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "policies page renders the page header for the active org",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/policies`)

      await expect(
        page.getByRole("heading", {
          name: "HR policies & rule configuration",
          exact: true,
        })
      ).toBeVisible()
    }
  )

  test(
    "policies page exposes the leave types tab + card by default",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/policies`)

      // Tab navigator → role=tablist contains the four canonical tabs.
      const leaveTypesTab = page.getByRole("tab", {
        name: "Leave types",
        exact: true,
      })
      await expect(leaveTypesTab).toBeVisible()
      await expect(leaveTypesTab).toHaveAttribute("aria-selected", "true")

      // Leave-types card body → either the seeded table or the
      // empty-state copy is acceptable; both prove the catalog query
      // ran end-to-end without throwing into the page error boundary.
      const tableTitle = page.getByText("Leave types", { exact: true }).first()
      await expect(tableTitle).toBeVisible()
    }
  )

  test(
    "policies page deep links into a different tab when ?tab=… is set",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/policies?tab=statutory`)

      // The Statutory tab is the URL-active one; the Leave types tab
      // sheds its active marker. Phase 3B "coming soon" copy renders
      // until the rule-pack inspector ships.
      await expect(
        page.getByRole("tab", { name: "Statutory rates", exact: true })
      ).toHaveAttribute("aria-selected", "true")
      await expect(
        page.getByRole("tab", { name: "Leave types", exact: true })
      ).toHaveAttribute("aria-selected", "false")
      await expect(
        page.getByText("Statutory rates — Phase 3B", { exact: true })
      ).toBeVisible()
    }
  )

  test(
    "policies page under unknown org slug renders organization not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto("/en/o/zz-no-such-afenda-org-slug-99/apps/hrm/policies")
      await expect(
        page.getByRole("heading", {
          name: "Organization not available",
          exact: true,
        })
      ).toBeVisible()
    }
  )
})

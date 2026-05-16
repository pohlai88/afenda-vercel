import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("HRM recruitment UI surface", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "recruitment page renders governed title and requisition affordances",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/dashboard/hrm/recruitment`)

      await expect(
        page.getByRole("heading", { name: "Recruitment", exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "New requisition", exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Create draft", exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Interviews due", exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Offers pending", exact: true })
      ).toBeVisible()
    }
  )

  test(
    "recruitment route under unknown org slug renders organization not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(
        "/en/o/zz-no-such-afenda-org-slug-99/dashboard/hrm/recruitment"
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

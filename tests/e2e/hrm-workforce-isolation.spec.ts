import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("HRM workforce tenant boundaries", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "unknown org slug renders organization not-found while signed in",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(
        "/en/o/zz-no-such-afenda-org-slug-99/apps/hrm/employees"
      )
      await expect(
        page.getByRole("heading", {
          name: "Organization not available",
          exact: true,
        })
      ).toBeVisible()
    }
  )

  test(
    "missing employee record renders dashboard not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")
      const fakeId = "00000000-0000-4000-8000-000000000001"
      await page.goto(`/en/o/${slug}/apps/hrm/employees/${fakeId}`)
      await expect(
        page.getByRole("heading", { name: "Page not found", exact: true })
      ).toBeVisible()
    }
  )

  test(
    "unknown org slug also denies access to the claims surface",
    { tag: "@hrm" },
    async ({ page }) => {
      await page.goto(
        "/en/o/zz-no-such-afenda-org-slug-99/apps/hrm/claims"
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

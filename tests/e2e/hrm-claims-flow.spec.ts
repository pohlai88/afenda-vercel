import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("HRM claims UI surface", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "claims page renders header and pending approvals",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/claims`)

      await expect(
        page.getByRole("heading", { name: "Claims", exact: true })
      ).toBeVisible()
      await expect(page.getByText("Pending approvals")).toBeVisible()
    }
  )

  test(
    "unknown claim id shows claim not-found shell",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(
        `/en/o/${slug}/apps/hrm/claims/00000000-0000-4000-8000-000000000001`
      )
      await expect(
        page.getByRole("heading", { name: "Claim not found", exact: true })
      ).toBeVisible()
    }
  )

  test(
    "claims route under unknown org slug renders organization not-found",
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

import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("HRM compliance UI surface", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "compliance page renders evidence header and operational health",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/compliance`)

      await expect(
        page.getByRole("heading", {
          name: "Compliance evidence center",
          exact: true,
        })
      ).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Operational health", exact: true })
      ).toBeVisible()
    }
  )

  test(
    "compliance obligations panel and export control are present",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/compliance`)

      await expect(
        page.getByTestId("hrm-compliance-obligations-panel")
      ).toBeVisible()
      await expect(
        page.getByTestId("hrm-compliance-export-dashboard")
      ).toBeVisible()
    }
  )

  test(
    "generate all packs control is present when period context allows",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/compliance`)
      const btn = page.getByTestId("hrm-compliance-generate-all-packs")
      await expect(btn).toBeVisible()
    }
  )

  test(
    "unknown evidence id shows compliance evidence not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(
        `/en/o/${slug}/apps/hrm/compliance/00000000-0000-4000-8000-000000000002`
      )
      await expect(
        page.getByRole("heading", {
          name: "Evidence not found",
          exact: true,
        })
      ).toBeVisible()
    }
  )
})

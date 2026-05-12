import { expect, test } from "@playwright/test"

import {
  resolveOrgSlugFromSession,
  signInAsOrgAdmin,
} from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

/**
 * Smoke gate for the HRM documents vault surface (PR #3 — documents
 * vault UI binding for the existing `attachEmployeeDocumentAction`
 * Server Action + governed Vercel Blob upload path).
 *
 * The full attach -> filter -> download round-trip is intentionally
 * out of scope here because it requires a seeded employee, an active
 * employment contract, and a Blob token per org. This spec proves the
 * route is reachable, renders the documented affordances (page
 * header + filter chips + library card), and respects tenant
 * boundaries — i.e. that the URL we just shipped does not 500 on
 * prod-shaped builds and that an unknown org slug renders the
 * canonical "organization not available" not-found shell.
 */
test.describe("HRM documents vault UI surface", () => {
  test.skip(
    !orgAdminEmail || !orgAdminPassword,
    "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for org-scoped HRM flows."
  )

  test(
    "documents vault page renders the page header for the active org",
    { tag: "@hrm" },
    async ({ page }) => {
      await signInAsOrgAdmin(page, orgAdminEmail!, orgAdminPassword!)
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/dashboard/hrm/documents`)

      await expect(
        page.getByRole("heading", {
          name: "HR documents vault",
          exact: true,
        })
      ).toBeVisible()
    }
  )

  test(
    "documents vault page exposes the filter + library cards",
    { tag: "@hrm" },
    async ({ page }) => {
      await signInAsOrgAdmin(page, orgAdminEmail!, orgAdminPassword!)
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/dashboard/hrm/documents`)

      await expect(page.getByText("Filters", { exact: true })).toBeVisible()
      await expect(
        page.getByText("Document library", { exact: true })
      ).toBeVisible()
    }
  )

  test(
    "documents vault preserves URL-driven filters on a deep link",
    { tag: "@hrm" },
    async ({ page }) => {
      await signInAsOrgAdmin(page, orgAdminEmail!, orgAdminPassword!)
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(
        `/en/o/${slug}/dashboard/hrm/documents?documentType=contract&classification=confidential`
      )

      // The page composer re-validates the URL filters against the
      // canonical enums. If the chip rehydrates with the deep-link
      // value, the contract round-trip is wired correctly.
      await expect(
        page.getByLabel("Document type")
      ).toHaveValue("contract")
      await expect(
        page.getByLabel("Classification")
      ).toHaveValue("confidential")
    }
  )

  test(
    "documents vault under unknown org slug renders organization not-found",
    { tag: "@hrm" },
    async ({ page }) => {
      await signInAsOrgAdmin(page, orgAdminEmail!, orgAdminPassword!)
      await page.goto(
        "/en/o/zz-no-such-afenda-org-slug-99/dashboard/hrm/documents"
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

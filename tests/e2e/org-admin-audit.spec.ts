import { expect, test } from "./fixtures/auth"
import type { Page } from "@playwright/test"

import {
  ORG_ADMIN_AUDIT_E2E_COPY,
  ORG_AUDIT_CSV_HEADER_PROVENANCE_SNIPPET,
} from "../fixtures/bootstrap-mocks"
import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

async function openAuditPage(page: Page, slug: string): Promise<void> {
  await page.goto(`/en/o/${slug}/admin/audit`)
  await expect(
    page.getByRole("heading", {
      name: ORG_ADMIN_AUDIT_E2E_COPY.pageHeading,
    })
  ).toBeVisible({
    timeout: 15_000,
  })
}

test.describe("org admin audit (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow (org admin with active org)."
      )
    }
  })

  test(
    "signed-in org admin can open audit page and stream export returns CSV",
    { tag: "@orgAdmin" },
    async ({ page }) => {
      const slug = await test.step("Resolve organization slug", async () =>
        resolveOrgSlugFromSession(page, orgSlugFromEnv))
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish setup at /console."
      )

      await test.step("Open audit listing", async () => {
        await openAuditPage(page, slug!)
      })

      await test.step("Authenticated CSV stream includes provenance columns", async () => {
        const response = await page.request.get(
          "/api/integrations/organization-audit-csv"
        )
        expect(response.ok()).toBe(true)
        const ct = response.headers()["content-type"] ?? ""
        expect(ct).toContain("text/csv")
        const text = await response.text()
        expect(text).toContain("\uFEFF")
        expect(text).toContain("id,created_at_utc,action")
        expect(text).toContain(ORG_AUDIT_CSV_HEADER_PROVENANCE_SNIPPET)
      })
    }
  )

  test(
    "audit origin filter navigation updates URL and shows Origin column",
    { tag: "@orgAdmin" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish setup at /console."
      )

      await openAuditPage(page, slug!)

      await test.step("Origin filter uses landmark navigation + links", async () => {
        const filterNav = page.getByRole("navigation", {
          name: ORG_ADMIN_AUDIT_E2E_COPY.originFilterNavAria,
        })
        await expect(filterNav).toBeVisible()
        await expect(
          filterNav.getByRole("link", {
            name: ORG_ADMIN_AUDIT_E2E_COPY.viewProduction,
          })
        ).toBeVisible()
        await filterNav
          .getByRole("link", { name: ORG_ADMIN_AUDIT_E2E_COPY.viewSimulated })
          .click()
        await expect(page).toHaveURL(/[?&]view=simulated(?:&|$)/)
        await expect(
          filterNav.getByRole("link", {
            name: ORG_ADMIN_AUDIT_E2E_COPY.viewSimulated,
          })
        ).toHaveAttribute("aria-current", "page")

        await expect(
          page.getByRole("columnheader", {
            name: ORG_ADMIN_AUDIT_E2E_COPY.tableHeaderOrigin,
          })
        ).toBeVisible()
      })
    }
  )

  test(
    "signed-in org admin can open workbench overview and audit page",
    { tag: "@orgAdmin" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish setup at /console."
      )

      await test.step("Workbench overview + sidebar", async () => {
        await page.goto(`/en/o/${slug}/admin`)
        await expect(
          page.getByRole("heading", { name: "Overview" })
        ).toBeVisible({
          timeout: 15_000,
        })

        const sidebar = page.getByRole("navigation", {
          name: "Organization admin sections",
        })
        await expect(sidebar).toBeVisible()
        for (const label of [
          "Overview",
          "Members",
          "Audit log",
          "Integrations",
          "Settings",
        ]) {
          await expect(sidebar.getByRole("link", { name: label })).toBeVisible()
        }
      })

      await test.step("Audit page heading", async () => {
        await openAuditPage(page, slug!)
      })
    }
  )
})

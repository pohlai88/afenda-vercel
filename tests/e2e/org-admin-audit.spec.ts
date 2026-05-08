import { expect, test } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

const ORG_SLUG_RE = /\/en\/o\/([^/]+)\/(?:dashboard|admin)/

async function resolveOrgSlug(
  page: import("@playwright/test").Page
): Promise<string | null> {
  if (orgSlugFromEnv) return orgSlugFromEnv

  const m = page.url().match(ORG_SLUG_RE)
  if (m) return m[1]

  await page.goto("/en/o")
  try {
    await page.waitForURL(ORG_SLUG_RE, { timeout: 15_000 })
  } catch {
    return null
  }
  const after = page.url().match(ORG_SLUG_RE)
  return after ? after[1] : null
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

  test("signed-in org admin can open audit page and stream export returns CSV", async ({
    page,
  }) => {
    await page.goto("/en/sign-in")
    await expect(
      page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
    ).toBeVisible()

    await page
      .getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      .fill(orgAdminEmail!)
    await page.getByLabel("Password", { exact: true }).fill(orgAdminPassword!)
    await page.getByRole("button", { name: "Sign in" }).click()

    await page.waitForURL(/\/en\/(onboarding|account|o)/, {
      timeout: 30_000,
    })

    const slug = await resolveOrgSlug(page)
    test.skip(
      !slug,
      "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
    )

    await page.goto(`/en/o/${slug}/admin/audit`)
    await expect(
      page.getByRole("heading", { name: "Organization audit" })
    ).toBeVisible({
      timeout: 15_000,
    })

    const response = await page.request.get(
      "/api/integrations/organization-audit-csv"
    )
    expect(response.ok()).toBe(true)
    const ct = response.headers()["content-type"] ?? ""
    expect(ct).toContain("text/csv")
    const text = await response.text()
    expect(text).toContain("\uFEFF")
    expect(text).toContain("id,created_at_utc,action")
  })

  test("signed-in org admin can open workbench overview and audit page", async ({
    page,
  }) => {
    await page.goto("/en/sign-in")
    await page
      .getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      .fill(orgAdminEmail!)
    await page.getByLabel("Password", { exact: true }).fill(orgAdminPassword!)
    await page.getByRole("button", { name: "Sign in" }).click()

    await page.waitForURL(/\/en\/(onboarding|account|o)/, {
      timeout: 30_000,
    })

    const slug = await resolveOrgSlug(page)
    test.skip(
      !slug,
      "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
    )

    await page.goto(`/en/o/${slug}/admin`)
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({
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

    await page.goto(`/en/o/${slug}/admin/audit`)
    await expect(
      page.getByRole("heading", { name: "Organization audit" })
    ).toBeVisible({ timeout: 15_000 })
  })
})

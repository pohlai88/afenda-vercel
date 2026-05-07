import { expect, test } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()

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

    await page.waitForURL(/\/en\/(dashboard|onboarding|account)/, {
      timeout: 30_000,
    })

    await page.goto("/en/account/organization/audit")
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

    await page.goto("/en/account/organization")
    await expect(
      page.getByRole("heading", { name: "Organization" })
    ).toBeVisible({
      timeout: 15_000,
    })
  })
})

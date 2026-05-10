import { expect, test } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

const inviteEmail = process.env.E2E_ORG_INVITE_EMAIL?.trim()
const invitePassword = process.env.E2E_ORG_INVITE_PASSWORD?.trim()

test.describe("org invite UI (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!inviteEmail || !invitePassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_INVITE_EMAIL and E2E_ORG_INVITE_PASSWORD (org admin with invite permission)."
      )
    }
  })

  test("signed-in org admin can open members workbench and invite member form", async ({
    page,
  }) => {
    await page.goto("/en/sign-in")
    await expect(
      page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
    ).toBeVisible()

    await page
      .getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      .fill(inviteEmail!)
    await page.getByLabel("Password", { exact: true }).fill(invitePassword!)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()

    await page.waitForURL(/\/en\/(console|account|o)/, {
      timeout: 30_000,
    })

    const slugMatch = page.url().match(/\/en\/o\/([^/]+)\//)
    test.skip(!slugMatch, "No active organization slug detected after sign-in.")
    const slug = slugMatch![1]

    await page.goto(`/en/o/${slug}/admin/members`)
    await expect(
      page.getByRole("heading", { name: "Invite member" })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible()
  })
})

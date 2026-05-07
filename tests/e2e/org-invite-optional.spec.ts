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

  test("signed-in org admin can open organization page and invite member form", async ({
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
    await page.getByRole("button", { name: "Sign in" }).click()

    await page.waitForURL(/\/en\/(dashboard|onboarding|account)/, {
      timeout: 30_000,
    })

    await page.goto("/en/account/organization")
    await expect(
      page.getByRole("heading", { name: "Organization" })
    ).toBeVisible({
      timeout: 15_000,
    })

    await expect(
      page.getByRole("heading", { name: "Invite member" })
    ).toBeVisible()
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible()
  })
})

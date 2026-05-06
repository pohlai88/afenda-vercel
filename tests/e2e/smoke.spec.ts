import { expect, test } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

test.describe("public shell", () => {
  test("home renders and links to sign-in", async ({ page }) => {
    await page.goto("/")
    await expect(
      page.getByRole("heading", { name: DEMO_PUBLIC_COPY.homeHeading })
    ).toBeVisible()
    await page.getByRole("link", { name: "Sign in" }).click()
    await expect(page).toHaveURL(/\/sign-in/)
    await expect(
      page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel)
    ).toBeVisible()
  })
})

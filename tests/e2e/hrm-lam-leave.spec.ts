import { test, expect } from "@playwright/test"

import { signInAsDevUser } from "./utils/auth"

test.describe("HRM leave workbench @smoke", () => {
  test("leave page loads pending inbox section", async ({ page }) => {
    await signInAsDevUser(page)
    await page.goto("/en/o/demo/apps/hrm/leave")
    await expect(
      page.getByRole("heading", { name: /pending approvals/i })
    ).toBeVisible()
  })
})

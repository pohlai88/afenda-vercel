import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("nexus screenshot utility (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow (org admin with active org)."
      )
    }
  })

  test(
    "org admin can enable screenshot utility and capture workspace and content previews",
    { tag: "@orgAdmin" },
    async ({ page }) => {
      const slug = await test.step("Resolve organization slug", async () =>
        resolveOrgSlugFromSession(page, orgSlugFromEnv))
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish setup at /bootstrap or /o."
      )

      await test.step("Open dashboard shell", async () => {
        await page.goto(`/en/o/${slug}/nexus`)
        await expect(
          page.getByRole("banner", { name: "Afenda system utility bar" })
        ).toBeVisible({ timeout: 15_000 })
      })

      await test.step("Enable screenshot utility from control menu", async () => {
        await page
          .getByRole("button", { name: "Open control menu", exact: true })
          .click()
        await page
          .getByRole("menuitem", {
            name: "Customize utility bar",
            exact: true,
          })
          .click()

        const screenshotSwitch = page.getByRole("switch", {
          name: "Screenshot",
          exact: true,
        })
        await expect(screenshotSwitch).toBeVisible()
        if ((await screenshotSwitch.getAttribute("aria-checked")) !== "true") {
          await screenshotSwitch.click()
        }
        await expect(screenshotSwitch).toHaveAttribute("aria-checked", "true")
        await page.keyboard.press("Escape")
      })

      await test.step("Capture workspace preview", async () => {
        await page
          .getByRole("button", { name: "Screenshot", exact: true })
          .click()
        await expect(
          page.getByRole("heading", { name: "Screenshot", exact: true })
        ).toBeVisible()
        await page.getByRole("button", { name: "Capture", exact: true }).click()
        await expect(
          page.getByText("Workspace capture ready for upload.", { exact: true })
        ).toBeVisible({ timeout: 20_000 })
      })

      await test.step("Capture content preview", async () => {
        await page.getByRole("radio", { name: "Content", exact: true }).click()
        await page.getByRole("button", { name: "Capture", exact: true }).click()
        await expect(
          page.getByText("Content capture ready for upload.", { exact: true })
        ).toBeVisible({ timeout: 20_000 })
      })
    }
  )
})

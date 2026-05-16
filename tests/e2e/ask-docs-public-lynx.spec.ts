import { expect, test } from "@playwright/test"

/**
 * Public Lynx (Ask Lynx) smoke on the ask-docs surface — no auth required.
 */
test.describe("Ask docs — Public Lynx", () => {
  test(
    "floating Ask Lynx trigger opens the chat panel",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/ask-docs")

      const trigger = page.getByRole("button", {
        name: /Ask Lynx/i,
      })
      await expect(trigger).toBeVisible()
      await trigger.click()

      await expect(page.locator("#ask-lynx-panel")).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Ask Lynx", level: 2 })
      ).toBeVisible()
      await expect(page.getByPlaceholder("Ask Lynx a question")).toBeVisible()
    }
  )

  test(
    "zh-CN locale renders translated index title",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/zh-CN/ask-docs")

      await expect(
        page.getByRole("heading", { name: "欢迎使用 Afenda" })
      ).toBeVisible()
    }
  )

  test(
    "zh-CN Ask Lynx panel uses localized chrome",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/zh-CN/ask-docs")

      await page.getByRole("button", { name: /问 Lynx/ }).click()

      await expect(
        page.getByRole("heading", { name: "问 Lynx", level: 2 })
      ).toBeVisible()
      await expect(page.getByPlaceholder("向 Lynx 提问")).toBeVisible()
    }
  )

  test(
    "suggested prompt sends a user message bubble",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/ask-docs")

      await page.getByRole("button", { name: /Ask Lynx/i }).click()

      await page
        .getByRole("button", { name: "What is Afenda?", exact: true })
        .click()

      await expect(page.getByText("What is Afenda?")).toBeVisible()
    }
  )
})

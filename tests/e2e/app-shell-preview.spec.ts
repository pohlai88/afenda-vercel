import { expect, test } from "@playwright/test"

/**
 * components2 app-shell dev preview — structural smoke.
 * Asserts the same shell primitives as the pre-migration page (preservation contract).
 */
test.describe("@smoke app-shell preview", () => {
  test(
    "renders shell chrome and governed stat cards",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/playground/shell-preview")

      await expect(page.getByLabel("Afenda home (preview)")).toBeVisible()
      await expect(page.getByLabel("Apps (preview)")).toBeVisible()
      await expect(
        page.getByLabel("Operational scope policy", { exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Open command palette" })
      ).toBeVisible()
      await expect(page.getByText("Shell Preview")).toBeVisible()
      await expect(page.getByLabel("Statistics")).toBeVisible()
      await expect(page.getByText("Total employees")).toBeVisible()
      await expect(page.getByText("Open positions")).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Employees" })
      ).toBeVisible()
      await expect(page.getByText("Alice Nguyen")).toBeVisible()
      await expect(page.getByText("Bob Carter")).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Search", exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Quick create", exact: true })
      ).toBeVisible()
    }
  )
})

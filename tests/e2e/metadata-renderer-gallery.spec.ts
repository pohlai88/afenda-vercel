import { expect, test } from "@playwright/test"

const WIDTHS = ["280", "480", "720"] as const

const SCENARIOS = [
  { id: "stat-card-kpi", label: "Open roles" },
  { id: "list-surface-table", label: "Alice Nguyen" },
  { id: "chart-time-series", label: "Leave utilization" },
  { id: "approval-timeline", label: "Submitted" },
] as const

/**
 * Governed metadata renderer gallery — visual smoke at contract widths (ADR-0026).
 */
test.describe("@smoke metadata renderer gallery", () => {
  test(
    "renders core scenarios at 280 / 480 / 720px with operator diagnostics",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/dev/metadata-renderer-gallery")
      await page.setViewportSize({ width: 1280, height: 1200 })

      for (const scenario of SCENARIOS) {
        const section = page.locator(`#${scenario.id}`)
        await expect(
          section.getByText(scenario.label, { exact: false })
        ).toBeVisible()

        for (const width of WIDTHS) {
          await section.getByRole("button", { name: `${width}px` }).click()
          await expect(
            section.getByText(scenario.label, { exact: false })
          ).toBeVisible()
        }

        await section.getByRole("button", { name: "operator" }).click()
        await expect(
          section.getByText(scenario.label, { exact: false })
        ).toBeVisible()
      }
    }
  )
})

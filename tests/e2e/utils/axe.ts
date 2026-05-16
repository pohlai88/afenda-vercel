import AxeBuilder from "@axe-core/playwright"
import { expect, type Page } from "@playwright/test"

/**
 * WCAG 2.1 AA scan for employee portal pages — blocks serious/critical violations.
 */
export async function assertNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  )
  expect(blocking, formatAxeViolations(blocking)).toEqual([])
}

function formatAxeViolations(
  violations: { id: string; impact?: string | null; help: string }[]
) {
  if (violations.length === 0) return ""
  return violations
    .map((v) => `${v.id} (${v.impact ?? "unknown"}): ${v.help}`)
    .join("\n")
}

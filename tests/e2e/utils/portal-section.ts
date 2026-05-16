import { expect, type Page } from "@playwright/test"

import { assertNoSeriousAxeViolations } from "./axe"

export async function expectEmployeePortalSection(
  page: Page,
  portalSlug: string,
  sectionPath: string,
  heading: string
) {
  await page.goto(`/en/p/${portalSlug}/employee/${sectionPath}`)
  await expect(
    page.getByRole("heading", { name: heading, exact: true })
  ).toBeVisible({ timeout: 30_000 })
  await assertNoSeriousAxeViolations(page)
}

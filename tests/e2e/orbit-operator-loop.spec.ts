import { expect, test } from "@playwright/test"

import {
  resolveOrgSlugFromSession,
  signInAsOrgAdmin,
} from "./utils/org-admin-auth"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

test.describe("orbit operator loop (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow (org admin with active org)."
      )
    }
  })

  test(
    "org admin can create a signal, promote it into execution work, comment, save a filtered view, and resolve it",
    { tag: "@orbit" },
    async ({ page }) => {
      await signInAsOrgAdmin(page, orgAdminEmail!, orgAdminPassword!)

      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish setup at /console."
      )

      const unique = Date.now()
      const signalTitle = `E2E Orbit signal ${unique}`
      const signalDescription = `Operational context ${unique}`
      const commentBody = `Comment evidence ${unique}`
      const viewName = `E2E queue view ${unique}`
      const viewSlug = `e2e-queue-view-${unique}`
      const resolutionNote = `Resolved during E2E orbit flow ${unique}`

      await page.goto(`/en/o/${slug}/dashboard/orbit/signals`)
      await expect(
        page.getByRole("heading", { name: /Orbit/i }).first()
      ).toBeVisible({ timeout: 15_000 })

      await page.getByLabel("Orbit signal title", { exact: true }).fill(signalTitle)
      await page
        .getByLabel("Orbit signal description", { exact: true })
        .fill(signalDescription)
      await page.getByRole("button", { name: "Add signal", exact: true }).click()

      await expect(page).toHaveURL(/focusKind=signal&focusId=/)
      await expect(
        page.getByRole("heading", { name: signalTitle, exact: true })
      ).toBeVisible()

      await page
        .getByRole("button", { name: "Promote to item", exact: true })
        .click()

      await expect(page).toHaveURL(/dashboard\/orbit\?status=promotedSignal/)
      await expect(
        page.getByRole("heading", { name: signalTitle, exact: true })
      ).toBeVisible()

      await page
        .getByLabel("Orbit comment body", { exact: true })
        .fill(commentBody)
      await page.getByRole("button", { name: "Add comment", exact: true }).click()
      await expect(page).toHaveURL(/status=commentAdded/)
      await expect(page.getByText(commentBody, { exact: true })).toBeVisible()

      await page
        .getByLabel("Orbit search query", { exact: true })
        .fill(signalTitle)
      await page
        .getByRole("button", { name: "Apply filters", exact: true })
        .click()

      await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(signalTitle)}`))

      await page
        .getByLabel("Orbit saved view name", { exact: true })
        .fill(viewName)
      await page
        .getByLabel("Orbit saved view slug", { exact: true })
        .fill(viewSlug)
      await page.getByRole("button", { name: "Save view", exact: true }).click()

      await expect(page).toHaveURL(new RegExp(`view=${viewSlug}`))
      await expect(
        page.getByRole("link", { name: new RegExp(viewName) })
      ).toBeVisible()

      await page
        .getByLabel("Orbit resolution note", { exact: true })
        .fill(resolutionNote)
      await page
        .getByRole("button", { name: "Resolve item", exact: true })
        .click()

      await expect(page).toHaveURL(/status=updatedItem/)
      await expect(page.getByText("resolved · pressure")).toBeVisible()
      await expect(page.getByText(resolutionNote, { exact: true })).toBeVisible()
    }
  )
})

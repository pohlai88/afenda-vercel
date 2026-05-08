import { expect, test } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

const ORG_SLUG_RE = /\/en\/o\/([^/]+)\/(?:dashboard|admin)/

async function resolveOrgSlug(
  page: import("@playwright/test").Page
): Promise<string | null> {
  if (orgSlugFromEnv) return orgSlugFromEnv

  const m = page.url().match(ORG_SLUG_RE)
  if (m) return m[1]

  await page.goto("/en/o")
  try {
    await page.waitForURL(ORG_SLUG_RE, { timeout: 15_000 })
  } catch {
    return null
  }
  const after = page.url().match(ORG_SLUG_RE)
  return after ? after[1] : null
}

test.describe("org todos (optional credentials)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow."
      )
    }
  })

  test(
    "signed-in user creates a todo, completes it, audit shows completion",
    { tag: "@smoke" },
    async ({ page }) => {
      await page.goto("/en/sign-in")
      await expect(
        page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
      ).toBeVisible()

      await page
        .getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
        .fill(orgAdminEmail!)
      await page.getByLabel("Password", { exact: true }).fill(orgAdminPassword!)
      await page.getByRole("button", { name: "Sign in", exact: true }).click()

      await page.waitForURL(/\/en\/(onboarding|account|o)/, {
        timeout: 30_000,
      })

      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      const title = `e2e-todo-${Date.now()}`
      await page.goto(`/en/o/${slug}/dashboard/todos`)
      await expect(
        page.getByRole("heading", { name: "Todos", exact: true })
      ).toBeVisible({ timeout: 15_000 })

      await page.getByLabel("Title", { exact: true }).fill(title)
      await page.getByRole("button", { name: "Add task" }).click()

      const row = page.getByRole("listitem").filter({ hasText: title })
      await expect(row).toBeVisible({ timeout: 15_000 })
      await row.getByRole("button", { name: "Mark complete" }).click()

      await page.goto(`/en/o/${slug}/admin/audit`)
      await expect(
        page.getByRole("heading", { name: "Organization audit" })
      ).toBeVisible({ timeout: 15_000 })

      await expect(page.getByText("erp.todo.task.complete")).toBeVisible({
        timeout: 15_000,
      })
    }
  )
})

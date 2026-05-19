import { expect, test } from "./fixtures/auth"

import { resolveOrgSlugFromSession } from "./utils/org-admin-auth"

const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

/**
 * Pattern C section composition smoke (Wave C4).
 *
 * Dev gallery proves forbidden / invalid / empty / trailing-disabled states without
 * seed variance. Org-scoped tests assert production routes mount governed sections.
 */
test.describe("@smoke Pattern C section gallery", () => {
  test("renders forbidden, invalid, empty, and trailing-disabled fixtures", async ({
    page,
  }) => {
    await page.goto("/en/playground/pattern-c-section-gallery")

    const forbidden = page.locator("#pattern-c-forbidden")
    await expect(
      forbidden.getByText("You do not have access", { exact: true })
    ).toBeVisible()

    const invalid = page.locator("#pattern-c-invalid")
    await expect(
      invalid.getByText("This list is unavailable", { exact: true })
    ).toBeVisible()

    const empty = page.locator("#pattern-c-empty")
    await expect(
      empty.getByText("No rows in this fixture", { exact: true })
    ).toBeVisible()
    await expect(
      empty.locator('[data-governed-list-state="empty"]')
    ).toBeVisible()

    const trailing = page.locator("#pattern-c-trailing-disabled")
    await expect(
      trailing.locator('[data-governed-list-state="ready"]')
    ).toBeVisible()
    await expect(trailing.getByRole("table")).toBeVisible()
    await expect(
      trailing.locator('[data-trailing-action-state="disabled"]').first()
    ).toBeVisible()
    await expect(
      trailing.getByRole("button", { name: "Record step", disabled: true })
    ).toBeVisible()
    await expect(
      trailing.getByRole("button", { name: "Record step", disabled: false })
    ).toHaveCount(1)
  })
})

test.describe("HRM Pattern C production mounts", () => {
  test(
    "lifecycle overview mounts governed list section shell",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/lifecycle`)

      const section = page.locator(
        '[data-testid="governed-list-section:hrm:lifecycle:overview"]'
      )
      await expect(section).toBeVisible()
      await expect(
        section.getByRole("table").or(
          section.getByText("No active employees in this organization yet.", {
            exact: true,
          })
        )
      ).toBeVisible()
    }
  )

  test(
    "onboarding mounts governed list section shell",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/onboarding`)

      const section = page.locator(
        '[data-testid="governed-list-section:hrm:onboarding:contracts"]'
      )
      await expect(section).toBeVisible()
      await expect(
        section
          .getByRole("table")
          .or(section.getByText("No active contracts", { exact: true }))
      ).toBeVisible()
    }
  )

  test(
    "leave pending inbox mounts governed embedded section",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/leave`)

      await expect(
        page.getByRole("heading", { name: "Leave management", exact: true })
      ).toBeVisible()

      const inbox = page.locator(
        '[data-testid="governed-list-section:hrm:leave:pending-inbox"]'
      )
      await expect(inbox).toBeVisible()
      await expect(
        inbox
          .getByRole("table")
          .or(inbox.getByText("No pending leave approvals", { exact: false }))
      ).toBeVisible()
    }
  )

  test(
    "performance page mounts governed cycles and reviews sections",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/performance`)

      await expect(
        page.getByRole("heading", {
          name: "Performance reviews",
          exact: true,
        })
      ).toBeVisible()

      const cycles = page.locator(
        '[data-testid="governed-list-section:hrm:performance:cycles"]'
      )
      await expect(cycles).toBeVisible()

      const reviews = page.locator(
        '[data-testid="governed-list-section:hrm:performance:reviews"]'
      )
      await expect(reviews).toBeVisible()
    }
  )

  test(
    "skills page mounts governed catalog section",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/skills`)

      await expect(
        page.getByRole("heading", { name: "Skills", exact: true })
      ).toBeVisible()

      const catalog = page.locator(
        '[data-testid="governed-list-section:hrm:skills:catalog"]'
      )
      await expect(catalog).toBeVisible()
    }
  )

  test(
    "claims page mounts governed recent activity section",
    { tag: "@hrm" },
    async ({ page }) => {
      const slug = await resolveOrgSlugFromSession(page, orgSlugFromEnv)
      test.skip(!slug, "No active organization slug — set E2E_ORG_SLUG.")

      await page.goto(`/en/o/${slug}/apps/hrm/claims`)

      await expect(
        page.getByRole("heading", { name: "Claims", exact: true })
      ).toBeVisible()

      const kanban = page.locator(
        '[data-testid="governed-list-section:hrm:claims:kanban"]'
      )
      await expect(kanban).toBeVisible()
      await expect(
        kanban
          .getByRole("region")
          .first()
          .or(kanban.getByText("temporarily unavailable"))
      ).toBeVisible()

      const recent = page.locator(
        '[data-testid="governed-list-section:hrm:claims:recent-activity"]'
      )
      await expect(recent).toBeVisible()
      await expect(
        recent
          .getByRole("table")
          .or(recent.getByText("No claim activity yet", { exact: false }))
      ).toBeVisible()
    }
  )
})

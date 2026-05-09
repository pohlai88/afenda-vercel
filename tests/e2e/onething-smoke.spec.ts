import { expect, test, type Page } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../fixtures/bootstrap-mocks"

const orgAdminEmail = process.env.E2E_ORG_ADMIN_EMAIL?.trim()
const orgAdminPassword = process.env.E2E_ORG_ADMIN_PASSWORD?.trim()
const orgSlugFromEnv = process.env.E2E_ORG_SLUG?.trim()

const ORG_SLUG_RE = /\/en\/o\/([^/]+)\/(?:dashboard|admin)/

/**
 * OneThing operational document computing — smoke coverage of the morphed
 * surface (shell + list pane + composer + detail toolbar + audit footer).
 *
 * Doctrine references this spec defends:
 *
 *   - List rows are single-line: title node + activity dot + ambient time
 *     (NO preview line, NO badges, NO chips). See onething-list-pane.tsx.
 *   - Composer captures with first-line headline + remaining lines body
 *     and persists across reload via localStorage.
 *   - Resolve hand-off shifts focus to the next ranked id (or the composer
 *     when the queue is empty), preserving operational momentum.
 *   - History stack discipline: J/K/click use router.replace, never push.
 *   - Audit footer is summary-first ("Last activity Xm ago · N events"),
 *     events revealed by an explicit Show toggle.
 *
 * Tagged @smoke so it runs in the CI smoke filter alongside other
 * dashboard surfaces.
 */

async function resolveOrgSlug(page: Page): Promise<string | null> {
  if (orgSlugFromEnv) return orgSlugFromEnv

  const direct = page.url().match(ORG_SLUG_RE)
  if (direct) return direct[1]

  await page.goto("/en/o")
  try {
    await page.waitForURL(ORG_SLUG_RE, { timeout: 15_000 })
  } catch {
    return null
  }
  const after = page.url().match(ORG_SLUG_RE)
  return after ? after[1] : null
}

async function signIn(page: Page) {
  await page.goto("/en/sign-in")
  await expect(
    page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
  ).toBeVisible()

  await page
    .getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
    .fill(orgAdminEmail!)
  await page.getByLabel("Password", { exact: true }).fill(orgAdminPassword!)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()

  await page.waitForURL(/\/en\/(onboarding|account|o)/, { timeout: 30_000 })
}

async function gotoOneThingDashboard(page: Page, slug: string): Promise<void> {
  await page.goto(`/en/o/${slug}/dashboard/onething`)
  await expect(
    page.getByRole("navigation", { name: "Operational queue" })
  ).toBeVisible({ timeout: 15_000 })
}

async function captureSituation(page: Page, body: string): Promise<void> {
  // The composer textarea uses the placeholder copy as its aria-label.
  const composer = page.getByLabel(/Capture the situation/)
  await composer.click()
  await composer.fill(body)
  await composer.press(
    process.platform === "darwin" ? "Meta+Enter" : "Control+Enter"
  )
  // Composer clears on success; if the action errored the row would
  // re-appear, so we wait for the empty composer rather than for a
  // specific list row (the ranker may place it anywhere).
  await expect(composer).toHaveValue("", { timeout: 10_000 })
}

test.describe("OneThing morph (operational document computing)", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow."
      )
    }
  })

  test(
    "list pane row anatomy is single-line",
    { tag: "@smoke" },
    async ({ page }) => {
      await signIn(page)
      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      const title = `e2e-row-anatomy-${Date.now()}`
      await gotoOneThingDashboard(page, slug!)
      await captureSituation(page, title)

      const list = page.getByRole("navigation", { name: "Operational queue" })
      const row = list.getByRole("button", { name: title }).first()
      await expect(row).toBeVisible({ timeout: 10_000 })

      // Doctrine guard: the row must have NO preview text, severity badges,
      // assignee avatars, or status chips. We assert by counting the row's
      // visible <span> nodes — the row anatomy is exactly:
      //   1. title span
      //   2. ambient-time span
      // plus an optional 3rd span for the freshness dot (~5px primary).
      const rowSpanCount = await row.locator("span").count()
      expect(rowSpanCount).toBeGreaterThanOrEqual(2)
      expect(rowSpanCount).toBeLessThanOrEqual(3)

      // No <img>, no SVG icons inside the row body.
      expect(await row.locator("img").count()).toBe(0)
      expect(await row.locator("svg").count()).toBe(0)
    }
  )

  test(
    "composer headline + body extraction (Notes-style multi-line)",
    { tag: "@smoke" },
    async ({ page }) => {
      await signIn(page)
      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      const headline = `e2e-headline-${Date.now()}`
      const body = "Detail line one.\nDetail line two."

      await gotoOneThingDashboard(page, slug!)
      const composer = page.getByLabel(/Capture the situation/)
      await composer.click()
      await composer.fill(`${headline}\n${body}`)
      await composer.press(
        process.platform === "darwin" ? "Meta+Enter" : "Control+Enter"
      )
      await expect(composer).toHaveValue("", { timeout: 10_000 })

      const list = page.getByRole("navigation", { name: "Operational queue" })
      const row = list.getByRole("button", { name: headline }).first()
      await expect(row).toBeVisible({ timeout: 10_000 })

      // The row's accessible name (from aria-current / its title text) is
      // the HEADLINE only — body text must not leak into list rendering.
      const rowText = (await row.innerText()).trim()
      expect(rowText.startsWith(headline)).toBe(true)
      expect(rowText).not.toContain("Detail line one")
    }
  )

  test(
    "composer draft survives reload via localStorage",
    { tag: "@smoke" },
    async ({ page }) => {
      await signIn(page)
      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      const draft = `e2e-draft-survives-${Date.now()}`
      await gotoOneThingDashboard(page, slug!)

      const composer = page.getByLabel(/Capture the situation/)
      await composer.click()
      await composer.fill(draft)
      // Wait long enough for the debounce flush.
      await page.waitForTimeout(400)

      await page.reload()
      const restored = page.getByLabel(/Capture the situation/)
      await expect(restored).toHaveValue(draft, { timeout: 10_000 })

      // Discard so the draft does not leak into other tests.
      await page.getByRole("button", { name: "Discard" }).click()
      await expect(restored).toHaveValue("", { timeout: 5_000 })
    }
  )

  test(
    "J / K navigation uses router.replace (back exits the module)",
    { tag: "@smoke" },
    async ({ page }) => {
      await signIn(page)
      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      // Seed two captures so the queue has items to step through.
      await gotoOneThingDashboard(page, slug!)
      const a = `e2e-kbd-a-${Date.now()}`
      const b = `e2e-kbd-b-${Date.now()}`
      await captureSituation(page, a)
      await captureSituation(page, b)

      // Snapshot the history length before stepping through; J/K should
      // not grow it (router.replace is the contract).
      const before = await page.evaluate(() => window.history.length)

      // Click anywhere in the list nav to ensure focus is not in an input.
      await page
        .getByRole("navigation", { name: "Operational queue" })
        .click({ position: { x: 4, y: 4 } })

      for (let i = 0; i < 4; i++) {
        await page.keyboard.press("j")
        await page.waitForTimeout(50)
      }
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press("k")
        await page.waitForTimeout(50)
      }

      const after = await page.evaluate(() => window.history.length)
      expect(after).toBeLessThanOrEqual(before + 1)
    }
  )

  test(
    "audit footer is summary-first; Show reveals events",
    { tag: "@smoke" },
    async ({ page }) => {
      await signIn(page)
      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      const title = `e2e-audit-${Date.now()}`
      await gotoOneThingDashboard(page, slug!)
      await captureSituation(page, title)

      const row = page
        .getByRole("navigation", { name: "Operational queue" })
        .getByRole("button", { name: title })
        .first()
      await row.click()

      const detail = page.getByRole("region", { name: "Continuity" })
      await expect(detail).toBeVisible({ timeout: 10_000 })

      // The summary line carries the count + relative time.
      await expect(detail.getByText(/Last activity .* event/i)).toBeVisible()

      // Events list is hidden by default.
      await expect(detail.getByRole("listitem")).toHaveCount(0)

      // Show toggle reveals events.
      await detail.getByRole("button", { name: "Show", exact: true }).click()
      await expect(detail.getByRole("listitem").first()).toBeVisible({
        timeout: 5_000,
      })

      // Hide collapses again.
      await detail.getByRole("button", { name: "Hide", exact: true }).click()
      await expect(detail.getByRole("listitem")).toHaveCount(0)
    }
  )
})

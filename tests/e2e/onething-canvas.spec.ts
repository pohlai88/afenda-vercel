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

async function signIn(page: import("@playwright/test").Page) {
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

/**
 * Operational atom UX — covers the capture-by-keystroke and canvas-focus
 * flows that the dashboard board no longer exposes. Action contracts are
 * exercised by `onething-smoke.spec.ts`; this spec focuses on the new
 * presentation primitives.
 */
test.describe("onething operational atom UX", () => {
  test.beforeEach(({}, testInfo) => {
    if (!orgAdminEmail || !orgAdminPassword) {
      testInfo.skip(
        true,
        "Set E2E_ORG_ADMIN_EMAIL and E2E_ORG_ADMIN_PASSWORD for this flow."
      )
    }
  })

  test(
    "pressing c opens the capture row; Esc closes it",
    { tag: "@smoke" },
    async ({ page }) => {
      await signIn(page)

      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      await page.goto(`/en/o/${slug}/dashboard/onething`)
      await expect(
        page.getByRole("heading", { name: "OneThing", exact: true })
      ).toBeVisible({ timeout: 15_000 })

      const captureInput = page.getByPlaceholder("What needs to happen…")
      await expect(captureInput).toBeHidden()

      await page
        .getByRole("region", { name: "OneThing list" })
        .first()
        .click({ position: { x: 4, y: 4 } })
      await page.keyboard.press("c")
      await expect(captureInput).toBeVisible({ timeout: 5_000 })

      await page.keyboard.press("Escape")
      await expect(captureInput).toBeHidden({ timeout: 5_000 })
    }
  )

  test(
    "clicking a tail item updates ?focus= and swaps the canvas",
    { tag: "@smoke" },
    async ({ page }) => {
      await signIn(page)

      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      // Seed two distinct onething so the tail has at least one entry to click.
      const titleA = `canvas-a-${Date.now()}`
      const titleB = `canvas-b-${Date.now()}`

      await page.goto(`/en/o/${slug}/dashboard/onething`)
      await page
        .getByRole("region", { name: "OneThing list" })
        .first()
        .click({ position: { x: 4, y: 4 } })

      for (const title of [titleA, titleB]) {
        await page.keyboard.press("c")
        await page.getByPlaceholder("What needs to happen…").fill(title)
        await page.getByRole("button", { name: "Add task" }).click()
        await expect(page.getByText(title).first()).toBeVisible({
          timeout: 10_000,
        })
      }

      // Whichever onething is currently in the tail — click it and verify ?focus=
      // appears in the URL and the canvas swaps.
      const tailLinks = page.getByRole("link").filter({
        hasText: new RegExp(`(${titleA}|${titleB})`),
      })

      const linkCount = await tailLinks.count()
      test.skip(
        linkCount === 0,
        "Both seeded onething collapsed onto the canvas — cannot exercise tail click in this run."
      )

      const targetLink = tailLinks.first()
      const targetTitle = (await targetLink.innerText()).trim().split("\n")[0]
      await targetLink.click()

      await expect(page).toHaveURL(/[?&]focus=/, { timeout: 10_000 })
      await expect(
        page.getByRole("article", { name: targetTitle })
      ).toBeVisible({ timeout: 10_000 })
    }
  )

  test(
    "floating Lynx summon opens the drawer",
    { tag: "@smoke" },
    async ({ page }) => {
      await signIn(page)

      const slug = await resolveOrgSlug(page)
      test.skip(
        !slug,
        "No active organization slug detected — set E2E_ORG_SLUG or finish onboarding."
      )

      await page.goto(`/en/o/${slug}/dashboard/onething`)
      const trigger = page.getByRole("button", { name: "Summon Lynx" })
      await expect(trigger).toBeVisible({ timeout: 15_000 })

      await trigger.click()
      await expect(
        page.getByRole("dialog").filter({ hasText: "Lynx" })
      ).toBeVisible({ timeout: 5_000 })
    }
  )
})

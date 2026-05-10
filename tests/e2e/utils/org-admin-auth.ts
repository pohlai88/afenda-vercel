import { expect, type Page } from "@playwright/test"

import { DEMO_PUBLIC_COPY } from "../../fixtures/bootstrap-mocks"

/** Matches active-org dashboard or admin URLs after sign-in. */
export const ORG_SLUG_FROM_SESSION_URL_RE =
  /\/en\/o\/([^/]+)\/(?:dashboard|admin)/

/**
 * Sign in as org admin test user — role-based locators, shared post-sign-in URL wait.
 * Pair with {@link resolveOrgSlugFromSession}.
 */
export async function signInAsOrgAdmin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/en/sign-in")
  await expect(
    page.getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
  ).toBeVisible()

  await page
    .getByLabel(DEMO_PUBLIC_COPY.signInEmailLabel, { exact: true })
    .fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()

  await page.waitForURL(/\/en\/(console|account|o)/, {
    timeout: 30_000,
  })
}

export async function resolveOrgSlugFromSession(
  page: Page,
  slugFromEnv: string | undefined
): Promise<string | null> {
  if (slugFromEnv && slugFromEnv.length > 0) return slugFromEnv

  const direct = page.url().match(ORG_SLUG_FROM_SESSION_URL_RE)
  if (direct) return direct[1]

  await page.goto("/en/o")
  try {
    await page.waitForURL(ORG_SLUG_FROM_SESSION_URL_RE, {
      timeout: 15_000,
    })
  } catch {
    return null
  }
  const after = page.url().match(ORG_SLUG_FROM_SESSION_URL_RE)
  return after ? after[1] : null
}

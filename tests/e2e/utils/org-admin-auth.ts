import { expect, type Page } from "@playwright/test"
import { neon } from "@neondatabase/serverless"

import { BOOTSTRAP_FIXTURE } from "../../fixtures/bootstrap-mocks"

/** Matches active-org dashboard or admin URLs after sign-in. */
export const ORG_SLUG_FROM_SESSION_URL_RE =
  /\/en\/o\/([^/]+)\/(?:dashboard|admin)/

let sql: ReturnType<typeof neon> | null = null

async function activateDemoOrgForUser(email: string): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  sql ??= neon(databaseUrl)
  await sql`
    UPDATE neon_auth.session
    SET "activeOrganizationId" = ${BOOTSTRAP_FIXTURE.organization.id}
    WHERE "userId" = (
      SELECT id FROM neon_auth.user WHERE email = ${email} LIMIT 1
    )
  `
}

/**
 * Sign in as org admin test user through the auth API and activate the demo org.
 *
 * Org-scoped E2E is not responsible for retesting the public sign-in form.
 * API sign-in keeps these specs focused on the protected route behavior and
 * avoids local-only dev overlays influencing form click coordinates.
 *
 * Pair with {@link resolveOrgSlugFromSession}.
 */
export async function signInAsOrgAdmin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  let response = await page.request.post("/api/auth/sign-in/email", {
    data: {
      email,
      password,
      callbackURL: `/en/o/${BOOTSTRAP_FIXTURE.organization.slug}/nexus`,
    },
  })
  for (let attempt = 1; !response.ok() && attempt < 3; attempt++) {
    await page.waitForTimeout(1_000 * attempt)
    response = await page.request.post("/api/auth/sign-in/email", {
      data: {
        email,
        password,
        callbackURL: `/en/o/${BOOTSTRAP_FIXTURE.organization.slug}/nexus`,
      },
    })
  }

  expect(response.ok(), await response.text()).toBe(true)
  await activateDemoOrgForUser(email)
  await page.context().clearCookies({
    name: "__Secure-neon-auth.local.session_data",
  })

  await page.goto(`/en/o/${BOOTSTRAP_FIXTURE.organization.slug}/nexus`, {
    waitUntil: "domcontentloaded",
  })
  if (ORG_SLUG_FROM_SESSION_URL_RE.test(page.url())) {
    return
  }
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

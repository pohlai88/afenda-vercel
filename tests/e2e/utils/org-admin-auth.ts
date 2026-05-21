import { expect, type Page } from "@playwright/test"
import { neon } from "@neondatabase/serverless"

import { BOOTSTRAP_FIXTURE } from "../../fixtures/bootstrap-mocks"

/** Matches active-org ERP URLs after sign-in (nexus, apps, admin, …). */
export const ORG_SLUG_FROM_SESSION_URL_RE = /\/en\/o\/([^/]+)\//

let sql: ReturnType<typeof neon> | null = null

async function activateDemoOrgForSession(input: {
  email: string
  sessionId: string | undefined
}): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  sql ??= neon(databaseUrl)
  const organizationId = BOOTSTRAP_FIXTURE.organization.id

  if (input.sessionId) {
    await sql`
      UPDATE neon_auth.session
      SET "activeOrganizationId" = ${organizationId}
      WHERE id = ${input.sessionId}
    `
    return
  }

  await sql`
    UPDATE neon_auth.session
    SET "activeOrganizationId" = ${organizationId}
    WHERE "userId" = (
      SELECT id FROM neon_auth.user WHERE email = ${input.email} LIMIT 1
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
  const signInRequest = () =>
    page.request.post("/api/auth/sign-in/email", {
      data: {
        email,
        password,
        callbackURL: `/en/o/${BOOTSTRAP_FIXTURE.organization.slug}/nexus`,
      },
      timeout: 120_000,
    })

  let response = await signInRequest()
  for (let attempt = 1; !response.ok() && attempt < 3; attempt++) {
    await page.waitForTimeout(1_000 * attempt)
    response = await signInRequest()
  }

  expect(response.ok(), await response.text()).toBe(true)

  let sessionId: string | undefined
  const sessionResponse = await page.request.get(
    "/api/auth/get-session?disableCookieCache=true",
    { timeout: 30_000 }
  )
  if (sessionResponse.ok()) {
    const payload = (await sessionResponse.json()) as {
      session?: { id?: string } | null
    } | null
    sessionId = payload?.session?.id ?? undefined
  }

  await activateDemoOrgForSession({ email, sessionId })

  // Drop signed session_data cache so the next navigation reads activeOrganizationId from DB.
  await page.context().clearCookies({
    name: "__Secure-neon-auth.local.session_data",
  })

  await page.goto(`/en/o/${BOOTSTRAP_FIXTURE.organization.slug}/nexus`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  })
  await page.waitForURL(ORG_SLUG_FROM_SESSION_URL_RE, { timeout: 60_000 })
  await expect(page).not.toHaveURL(/session-expired/)
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

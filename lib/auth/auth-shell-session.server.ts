import "server-only"

import { cache } from "react"
import type { Route } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { isGlobalAdminUser } from "./permission.server"
import { auth } from "./neon.server"
import {
  findOrganizationIdBySlug,
  hasOrgMembership,
  mapIamSessionUser,
  type BetterAuthSessionUserLike,
  type IamSessionUserFields,
} from "./org-membership.server"

export type AuthShellSignedInSession = {
  userId: string
  sessionId: string
  user: IamSessionUserFields & {
    emailVerified: boolean
  }
}

export type AuthShellOrgSession = AuthShellSignedInSession & {
  organizationId: string
}

async function redirectSignIn(): Promise<never> {
  const locale = await getRequestAppLocale()
  redirect(toLocalePath(locale, "/sign-in") as Route)
}

function mapAuthShellSignedInSession(input: {
  user: BetterAuthSessionUserLike
  sessionId: string
}): AuthShellSignedInSession {
  const mapped = mapIamSessionUser(input.user)
  return {
    userId: mapped.userId,
    sessionId: input.sessionId,
    user: {
      ...mapped.user,
      emailVerified: Boolean(input.user.emailVerified),
    },
  }
}

/**
 * Per-request session read for the auth/account shell.
 *
 * Passes the incoming request `headers()` so Better Auth uses the supplied
 * request context for cookie cache refresh; without explicit headers it falls
 * back to `next/headers` `cookies()` and tries to mutate cookies, which Next.js
 * 16 disallows in Server Components / layouts (cookies are read-only there).
 */
const readAuthShellSession = cache(async () => {
  const { data } = await auth.getSession({
    fetchOptions: { headers: await headers() },
  })
  return data ?? null
})

/** Signed-in guard for `(auth)` / `(iam)` using Neon `auth.getSession()` (flat routes). */
export const getAuthShellSignedInSessionOrNull = cache(
  async (): Promise<AuthShellSignedInSession | null> => {
    const session = await readAuthShellSession()
    if (!session?.user?.id || !session.session?.id) {
      return null
    }

    return mapAuthShellSignedInSession({
      user: session.user as BetterAuthSessionUserLike,
      sessionId: session.session.id,
    })
  }
)

/** Signed-in guard for `(auth)` / `(iam)` using Neon `auth.getSession()` (flat routes). */
export async function requireAuthShellSignedInSession(): Promise<AuthShellSignedInSession> {
  const session = await getAuthShellSignedInSessionOrNull()
  if (!session) {
    return await redirectSignIn()
  }

  return session
}

export async function requireAuthShellGlobalAdminSession(): Promise<AuthShellSignedInSession> {
  const signed = await requireAuthShellSignedInSession()
  if (!isGlobalAdminUser(signed.userId, signed.user.role)) {
    const locale = await getRequestAppLocale()
    redirect(toLocalePath(locale, "/") as Route)
  }
  return signed
}

export const requireAuthShellOrgSession = cache(
  async (orgSlug?: string): Promise<AuthShellOrgSession> => {
    const signed = await requireAuthShellSignedInSession()
    const session = await readAuthShellSession()
    let organizationId: string | null =
      (session?.session as { activeOrganizationId?: string | null } | null)
        ?.activeOrganizationId ?? null

    if (orgSlug) {
      organizationId = await findOrganizationIdBySlug(orgSlug)
    }

    if (!organizationId) {
      return await redirectSignIn()
    }

    const member = await hasOrgMembership(signed.userId, organizationId)
    if (!member) {
      return await redirectSignIn()
    }

    return { ...signed, organizationId }
  }
)

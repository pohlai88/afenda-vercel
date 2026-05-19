import "server-only"

import { cache } from "react"
import type { Route } from "next"
import { redirect } from "next/navigation"

import { getAuthSession } from "#lib/session-cache"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { AUTH_STATUS } from "./auth-status.shared"
import { redirectToAuthInterruption } from "./interruption-redirect.server"
import { auth } from "./neon.server"
import {
  hasOrgMembership,
  assertOrgMembership,
  mapIamSessionUser,
  type BetterAuthSessionUserLike,
  type IamSessionUserFields,
} from "./org-membership.server"
import { isGlobalAdminUser } from "./permission.server"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthSession } from "#lib/db/schema-neon-auth"

export type OrgSession = {
  userId: string
  sessionId: string
  organizationId: string
  user: IamSessionUserFields
}

export type GlobalAdminSession = {
  userId: string
  sessionId: string
  user: IamSessionUserFields
}

export type SignedInSession = {
  userId: string
  sessionId: string
  user: IamSessionUserFields
}

type SessionWithOrg = {
  id: string
  activeOrganizationId?: string | null
}

function mapSignedInSession(input: {
  user: BetterAuthSessionUserLike
  sessionId: string
}): SignedInSession {
  const mapped = mapIamSessionUser(input.user)
  return {
    userId: mapped.userId,
    sessionId: input.sessionId,
    user: mapped.user,
  }
}

async function resolveOrgSessionFromParts(input: {
  user: BetterAuthSessionUserLike
  sessionId: string
  organizationId: string | null | undefined
}): Promise<OrgSession | null> {
  if (!input.organizationId) return null
  const member = await hasOrgMembership(input.user.id, input.organizationId)
  if (!member) return null

  const signedIn = mapSignedInSession({
    user: input.user,
    sessionId: input.sessionId,
  })

  return {
    ...signedIn,
    organizationId: input.organizationId,
  }
}

/** Requires a valid Better Auth session (user signed in). No org requirement. */
export async function requireSignedInSession(): Promise<SignedInSession> {
  const session = await getAuthSession()

  if (!session?.user?.id || !session.session?.id) {
    return await redirectToAuthInterruption(AUTH_STATUS.SESSION_EXPIRED)
  }

  return mapSignedInSession({
    user: session.user as BetterAuthSessionUserLike,
    sessionId: session.session.id,
  })
}

/**
 * Requires a signed-in user who is a global Better Auth admin (`admin` role or
 * `BETTER_AUTH_ADMIN_USER_IDS`). Does not require an active organization.
 */
export const requireGlobalAdminSession = cache(
  async function requireGlobalAdminSession(): Promise<GlobalAdminSession> {
    const session = await getAuthSession()

    if (!session?.user?.id || !session.session?.id) {
      return await redirectToAuthInterruption(AUTH_STATUS.SESSION_EXPIRED)
    }

    const user = session.user as BetterAuthSessionUserLike

    if (!isGlobalAdminUser(user.id, user.role)) {
      const locale = await getRequestAppLocale()
      redirect(toLocalePath(locale, "/o") as Route)
    }

    return mapSignedInSession({
      user,
      sessionId: session.session.id,
    })
  }
)

/**
 * Requires an authenticated user with an active organization and membership.
 * Use in Server Actions and RSC for tenant-scoped ERP operations.
 *
 * Wrapped in `React.cache` so multiple reads in one request dedupe session + membership work.
 */
export const requireOrgSession = cache(
  async function requireOrgSession(): Promise<OrgSession> {
    const session = await getAuthSession()

    if (!session?.user?.id || !session.session?.id) {
      return await redirectToAuthInterruption(AUTH_STATUS.SESSION_EXPIRED)
    }

    const user = session.user as BetterAuthSessionUserLike
    const sess = session.session as SessionWithOrg
    const resolved = await resolveOrgSessionFromParts({
      user,
      sessionId: session.session.id,
      organizationId: sess.activeOrganizationId,
    })

    if (!resolved) {
      return await redirectToAuthInterruption(AUTH_STATUS.ORG_REQUIRED)
    }

    return resolved
  }
)

/**
 * Alias for {@link requireOrgSession} — use when naming “tenant context” reads
 * in feature data layers (same per-request cache).
 */
export const getOrgTenantContext = requireOrgSession

/**
 * Set the active organization for the current authenticated session after
 * verifying the user is still a member of that organization.
 */
export async function setActiveOrganizationForSession(input: {
  userId: string
  sessionId: string
  organizationId: string
}): Promise<void> {
  await assertOrgMembership(input.userId, input.organizationId)

  await db
    .update(neonAuthSession)
    .set({ activeOrganizationId: input.organizationId })
    .where(
      and(
        eq(neonAuthSession.id, input.sessionId),
        eq(neonAuthSession.userId, input.userId)
      )
    )
}

/**
 * Same checks as {@link requireOrgSession}, using the incoming request headers
 * (for Route Handlers). Returns null instead of redirecting when invalid.
 */
export async function getOrgSessionFromRequest(
  request: Request
): Promise<OrgSession | null> {
  const { data: session } = await auth.getSession({
    fetchOptions: { headers: request.headers },
  })

  if (!session?.user?.id || !session.session?.id) {
    return null
  }

  const user = session.user as BetterAuthSessionUserLike
  const sess = session.session as SessionWithOrg

  return resolveOrgSessionFromParts({
    user,
    sessionId: session.session.id,
    organizationId: sess.activeOrganizationId,
  })
}

/**
 * Same checks as {@link requireSignedInSession}, using the incoming request
 * headers (for Route Handlers). Returns null instead of redirecting when invalid.
 */
export async function getSignedInSessionFromRequest(
  request: Request
): Promise<SignedInSession | null> {
  const { data: session } = await auth.getSession({
    fetchOptions: { headers: request.headers },
  })

  if (!session?.user?.id || !session.session?.id) {
    return null
  }

  return mapSignedInSession({
    user: session.user as BetterAuthSessionUserLike,
    sessionId: session.session.id,
  })
}

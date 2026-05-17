import "server-only"

import { cache } from "react"
import type { Route } from "next"
import { redirect } from "next/navigation"

import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { AUTH_STATUS } from "./auth-status.shared"
import { redirectToAuthInterruption } from "./interruption-redirect.server"
import { auth } from "./neon.server"
import { isGlobalAdminUser } from "./permission.server"
import { getAuthSession } from "#lib/session-cache"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember, neonAuthSession } from "#lib/db/schema-neon-auth"

export type OrgSession = {
  userId: string
  sessionId: string
  organizationId: string
  user: { email: string; name: string | null; role: string | null }
}

export type GlobalAdminSession = {
  userId: string
  sessionId: string
  user: { email: string; name: string | null; role: string | null }
}

export type SignedInSession = {
  userId: string
  sessionId: string
  user: { email: string; name: string | null; role: string | null }
}

type SessionUserWithRole = {
  id: string
  email: string
  name: string | null
  role?: string | null
}

type SessionWithOrg = {
  id: string
  activeOrganizationId?: string | null
}

/** Requires a valid Better Auth session (user signed in). No org requirement. */
export async function requireSignedInSession(): Promise<SignedInSession> {
  const session = await getAuthSession()

  if (!session?.user?.id || !session.session?.id) {
    return await redirectToAuthInterruption(AUTH_STATUS.SESSION_EXPIRED)
  }

  const user = session.user as SessionUserWithRole

  return {
    userId: user.id,
    sessionId: session.session.id,
    user: {
      email: user.email,
      name: user.name,
      role: user.role ?? null,
    },
  }
}

/**
 * Requires a signed-in user who is a global Better Auth admin (`admin` role or
 * `BETTER_AUTH_ADMIN_USER_IDS`). Does not require an active organization.
 */
export async function requireGlobalAdminSession(): Promise<GlobalAdminSession> {
  const session = await getAuthSession()

  if (!session?.user?.id || !session.session?.id) {
    return await redirectToAuthInterruption(AUTH_STATUS.SESSION_EXPIRED)
  }

  const user = session.user as SessionUserWithRole

  if (!isGlobalAdminUser(user.id, user.role)) {
    const locale = await getRequestAppLocale()
    redirect(toLocalePath(locale, "/o") as Route)
  }

  return {
    userId: user.id,
    sessionId: session.session.id,
    user: {
      email: user.email,
      name: user.name,
      role: user.role ?? null,
    },
  }
}

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

    const user = session.user as SessionUserWithRole
    const sess = session.session as SessionWithOrg
    const organizationId = sess.activeOrganizationId
    if (!organizationId) {
      return await redirectToAuthInterruption(AUTH_STATUS.ORG_REQUIRED)
    }

    const [row] = await db
      .select({ id: neonAuthMember.id })
      .from(neonAuthMember)
      .where(
        and(
          eq(neonAuthMember.userId, user.id),
          eq(neonAuthMember.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!row) {
      return await redirectToAuthInterruption(AUTH_STATUS.ORG_REQUIRED)
    }

    return {
      userId: user.id,
      sessionId: session.session.id,
      organizationId,
      user: {
        email: user.email,
        name: user.name,
        role: user.role ?? null,
      },
    }
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
  const [member] = await db
    .select({ id: neonAuthMember.id })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.userId, input.userId),
        eq(neonAuthMember.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!member) {
    throw new Error("Not a member of the requested organization.")
  }

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

  const user = session.user as SessionUserWithRole
  const sess = session.session as SessionWithOrg
  const organizationId = sess.activeOrganizationId
  if (!organizationId) {
    return null
  }

  const [row] = await db
    .select({ id: neonAuthMember.id })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.userId, user.id),
        eq(neonAuthMember.organizationId, organizationId)
      )
    )
    .limit(1)

  if (!row) {
    return null
  }

  return {
    userId: user.id,
    sessionId: session.session.id,
    organizationId,
    user: {
      email: user.email,
      name: user.name,
      role: user.role ?? null,
    },
  }
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

  const user = session.user as SessionUserWithRole

  return {
    userId: user.id,
    sessionId: session.session.id,
    user: {
      email: user.email,
      name: user.name,
      role: user.role ?? null,
    },
  }
}

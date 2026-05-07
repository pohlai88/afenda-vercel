import "server-only"

import { cache } from "react"
import type { Route } from "next"
import { redirect } from "next/navigation"

import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { AUTH_STATUS, redirectToAuthInterruption } from "#lib/auth"
import { auth } from "#lib/auth/config.server"
import { isGlobalAdminUser } from "#lib/auth/permission.server"
import { getAuthSession } from "#lib/session-cache"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { member } from "#lib/db/schema"

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
    redirect(toLocalePath(locale, "/dashboard") as Route)
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
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, user.id),
          eq(member.organizationId, organizationId)
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
 * Same checks as {@link requireOrgSession}, using the incoming request headers
 * (for Route Handlers). Returns null instead of redirecting when invalid.
 */
export async function getOrgSessionFromRequest(
  request: Request
): Promise<OrgSession | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
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
    .select({ id: member.id })
    .from(member)
    .where(
      and(eq(member.userId, user.id), eq(member.organizationId, organizationId))
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

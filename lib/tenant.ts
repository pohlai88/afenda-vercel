import "server-only"

import { redirect } from "next/navigation"

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

/** Requires a valid Better Auth session (user signed in). No org requirement. */
export async function requireSignedInSession(): Promise<SignedInSession> {
  const session = await getAuthSession()

  if (!session?.user?.id || !session.session?.id) {
    redirect("/sign-in")
  }

  return {
    userId: session.user.id,
    sessionId: session.session.id,
    user: {
      email: session.user.email,
      name: session.user.name,
      role: session.user.role ?? null,
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
    redirect("/sign-in")
  }

  if (!isGlobalAdminUser(session.user.id, session.user.role)) {
    redirect("/dashboard")
  }

  return {
    userId: session.user.id,
    sessionId: session.session.id,
    user: {
      email: session.user.email,
      name: session.user.name,
      role: session.user.role ?? null,
    },
  }
}

/**
 * Requires an authenticated user with an active organization and membership.
 * Use in Server Actions and RSC for tenant-scoped ERP operations.
 */
export async function requireOrgSession(): Promise<OrgSession> {
  const session = await getAuthSession()

  if (!session?.user?.id || !session.session?.id) {
    redirect("/sign-in")
  }

  const organizationId = session.session.activeOrganizationId
  if (!organizationId) {
    redirect("/onboarding")
  }

  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, organizationId)
      )
    )
    .limit(1)

  if (!row) {
    redirect("/onboarding")
  }

  return {
    userId: session.user.id,
    sessionId: session.session.id,
    organizationId,
    user: {
      email: session.user.email,
      name: session.user.name,
      role: session.user.role ?? null,
    },
  }
}

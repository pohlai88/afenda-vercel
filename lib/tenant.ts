import "server-only"

import { redirect } from "next/navigation"

import { getAuthSession } from "#lib/session-cache"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { member } from "#lib/db/schema"

export type OrgSession = {
  userId: string
  sessionId: string
  organizationId: string
  user: { email: string; name: string | null }
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
        eq(member.organizationId, organizationId),
      ),
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
    },
  }
}

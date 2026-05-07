import "server-only"

import { and, asc, eq, gt } from "drizzle-orm"

import { db } from "#lib/db"
import { invitation, member, organization, user } from "#lib/db/schema"

export type OrgWorkbenchMemberRow = {
  id: string
  userId: string
  name: string | null
  email: string
  role: string
}

export type OrgWorkbenchInvitationRow = {
  id: string
  email: string
  role: string | null
  status: string
  expiresAt: Date
}

export async function fetchOrgWorkbenchIdentity(organizationId: string) {
  const [row] = await db
    .select({ name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return row ?? null
}

export async function fetchOrgWorkbenchMembers(
  organizationId: string
): Promise<OrgWorkbenchMemberRow[]> {
  return db
    .select({
      id: member.id,
      userId: member.userId,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(user.email))
}

export async function fetchOrgWorkbenchPendingInvitations(
  organizationId: string
): Promise<OrgWorkbenchInvitationRow[]> {
  return db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date())
      )
    )
    .orderBy(asc(invitation.email))
}

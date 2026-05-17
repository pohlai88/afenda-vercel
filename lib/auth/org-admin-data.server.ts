import "server-only"

import { and, asc, eq, gt } from "drizzle-orm"

import { db } from "#lib/db"
import {
  neonAuthInvitation,
  neonAuthMember,
  neonAuthOrganization,
  neonAuthUser,
} from "#lib/db/schema-neon-auth"

export type OrgAdminMemberRow = {
  id: string
  userId: string
  name: string | null
  email: string
  role: string
}

export type OrgAdminInvitationRow = {
  id: string
  email: string
  role: string | null
  status: string
  expiresAt: Date
}

export async function fetchOrgAdminIdentity(organizationId: string) {
  const [row] = await db
    .select({
      name: neonAuthOrganization.name,
      slug: neonAuthOrganization.slug,
    })
    .from(neonAuthOrganization)
    .where(eq(neonAuthOrganization.id, organizationId))
    .limit(1)
  return row ?? null
}

export async function fetchOrgAdminMembers(
  organizationId: string
): Promise<OrgAdminMemberRow[]> {
  return db
    .select({
      id: neonAuthMember.id,
      userId: neonAuthMember.userId,
      name: neonAuthUser.name,
      email: neonAuthUser.email,
      role: neonAuthMember.role,
    })
    .from(neonAuthMember)
    .innerJoin(neonAuthUser, eq(neonAuthMember.userId, neonAuthUser.id))
    .where(eq(neonAuthMember.organizationId, organizationId))
    .orderBy(asc(neonAuthUser.email))
}

export async function fetchOrgAdminPendingInvitations(
  organizationId: string
): Promise<OrgAdminInvitationRow[]> {
  return db
    .select({
      id: neonAuthInvitation.id,
      email: neonAuthInvitation.email,
      role: neonAuthInvitation.role,
      status: neonAuthInvitation.status,
      expiresAt: neonAuthInvitation.expiresAt,
    })
    .from(neonAuthInvitation)
    .where(
      and(
        eq(neonAuthInvitation.organizationId, organizationId),
        eq(neonAuthInvitation.status, "pending"),
        gt(neonAuthInvitation.expiresAt, new Date())
      )
    )
    .orderBy(asc(neonAuthInvitation.email))
}

import "server-only"

import { and, asc, eq, gt, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  neonAuthInvitation,
  neonAuthOrganization,
} from "#lib/db/schema-neon-auth"

export type ConsolePendingInviteRow = {
  id: string
  expiresAt: Date
  orgName: string
}

export async function listConsolePendingInvitesForEmail(
  userEmail: string
): Promise<ConsolePendingInviteRow[]> {
  const normalized = userEmail.trim().toLowerCase()

  return db
    .select({
      id: neonAuthInvitation.id,
      expiresAt: neonAuthInvitation.expiresAt,
      orgName: neonAuthOrganization.name,
    })
    .from(neonAuthInvitation)
    .innerJoin(
      neonAuthOrganization,
      eq(neonAuthInvitation.organizationId, neonAuthOrganization.id)
    )
    .where(
      and(
        eq(neonAuthInvitation.status, "pending"),
        gt(neonAuthInvitation.expiresAt, new Date()),
        sql`lower(${neonAuthInvitation.email}) = ${normalized}`
      )
    )
    .orderBy(asc(neonAuthOrganization.name))
}

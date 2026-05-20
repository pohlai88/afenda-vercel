import "server-only"

import { desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmShiftRosterPublication } from "#lib/db/schema"

export type ShiftRosterPublicationRow = {
  readonly id: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly publishedAt: Date
  readonly publishedByUserId: string
  readonly note: string | null
}

export async function listRosterPublicationsForOrg(
  organizationId: string,
  limit = 20
): Promise<ShiftRosterPublicationRow[]> {
  return db
    .select({
      id: hrmShiftRosterPublication.id,
      periodStart: hrmShiftRosterPublication.periodStart,
      periodEnd: hrmShiftRosterPublication.periodEnd,
      publishedAt: hrmShiftRosterPublication.publishedAt,
      publishedByUserId: hrmShiftRosterPublication.publishedByUserId,
      note: hrmShiftRosterPublication.note,
    })
    .from(hrmShiftRosterPublication)
    .where(eq(hrmShiftRosterPublication.organizationId, organizationId))
    .orderBy(desc(hrmShiftRosterPublication.publishedAt))
    .limit(limit)
}

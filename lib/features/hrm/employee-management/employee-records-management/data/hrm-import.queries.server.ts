import "server-only"

import { desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmImportSession } from "#lib/db/schema"

export type HrmImportSessionListRow = {
  id: string
  importType: string
  status: string
  rowCount: number
  createdAt: Date
  updatedAt: Date
}

export async function listRecentImportSessions(
  organizationId: string,
  limit = 20
): Promise<HrmImportSessionListRow[]> {
  return db
    .select({
      id: hrmImportSession.id,
      importType: hrmImportSession.importType,
      status: hrmImportSession.status,
      rowCount: hrmImportSession.rowCount,
      createdAt: hrmImportSession.createdAt,
      updatedAt: hrmImportSession.updatedAt,
    })
    .from(hrmImportSession)
    .where(eq(hrmImportSession.organizationId, organizationId))
    .orderBy(desc(hrmImportSession.createdAt))
    .limit(limit)
}

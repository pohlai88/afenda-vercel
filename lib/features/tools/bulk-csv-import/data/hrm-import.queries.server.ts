import "server-only"

import { desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmImportSession } from "#lib/db/schema"

import { hrmImportRollbackJsonSchema } from "../schemas/hrm-import.schema"

export type HrmImportSessionListRow = {
  id: string
  importType: string
  status: string
  rowCount: number
  errorJson: { rows: Array<{ line: number; message: string }> } | null
  rollbackKind: string | null
  createdAt: Date
  updatedAt: Date
}

export async function listRecentImportSessions(
  organizationId: string,
  limit = 20
): Promise<HrmImportSessionListRow[]> {
  const rows = await db
    .select({
      id: hrmImportSession.id,
      importType: hrmImportSession.importType,
      status: hrmImportSession.status,
      rowCount: hrmImportSession.rowCount,
      errorJson: hrmImportSession.errorJson,
      rollbackJson: hrmImportSession.rollbackJson,
      createdAt: hrmImportSession.createdAt,
      updatedAt: hrmImportSession.updatedAt,
    })
    .from(hrmImportSession)
    .where(eq(hrmImportSession.organizationId, organizationId))
    .orderBy(desc(hrmImportSession.createdAt))
    .limit(limit)

  return rows.map((row) => {
    const parsed = hrmImportRollbackJsonSchema.safeParse(row.rollbackJson)
    return {
      id: row.id,
      importType: row.importType,
      status: row.status,
      rowCount: row.rowCount,
      errorJson: row.errorJson as HrmImportSessionListRow["errorJson"],
      rollbackKind: parsed.success ? parsed.data.kind : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  })
}

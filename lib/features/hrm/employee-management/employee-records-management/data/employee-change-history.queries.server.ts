import "server-only"

import { and, desc, eq, inArray, lt } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployeeChangeHistory } from "#lib/db/schema"

export type EmployeeChangeHistoryRow = {
  id: string
  fieldName: string
  oldValue: unknown
  newValue: unknown
  changedByUserId: string
  changedAt: Date
  /** When the change takes effect; null means effective immediately at changedAt. HRM-EMP-REC-019. */
  effectiveDate: Date | null
  /** Business reason recorded by the actor (e.g. "Promotion", "Relocation"). HRM-EMP-REC-019. */
  reason: string | null
  /** Reference to an approval record if this change required workflow approval. HRM-EMP-REC-019. */
  approvalReference: string | null
}

export type ListEmployeeChangeHistoryResult = {
  rows: EmployeeChangeHistoryRow[]
  /** Cursor for the next page — pass as `cursor` on the next call. Null when no more rows. */
  nextCursor: string | null
}

const DEFAULT_PAGE_SIZE = 40
const MAX_PAGE_SIZE = 200

/**
 * Lists employee change history with cursor-based pagination.
 *
 * Returns newest-first (changedAt DESC). Pass the returned `nextCursor` as `cursor`
 * in the next call to page forward. Covers HRM-EMP-REC-019 audit trail retrieval.
 *
 * @param fieldNames — optional filter to specific field names (e.g. ["employmentStatus"])
 */
export async function listEmployeeChangeHistory(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly limit?: number
  /** Opaque cursor from the previous page's `nextCursor`. */
  readonly cursor?: string | null
  /** Optional field name filter (e.g. ["employmentStatus", "managerEmployeeId"]). */
  readonly fieldNames?: string[]
}): Promise<ListEmployeeChangeHistoryResult> {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
  const fetchLimit = limit + 1

  const cursorDate = input.cursor ? new Date(input.cursor) : null

  const conditions = [
    eq(hrmEmployeeChangeHistory.organizationId, input.organizationId),
    eq(hrmEmployeeChangeHistory.employeeId, input.employeeId),
    ...(cursorDate ? [lt(hrmEmployeeChangeHistory.changedAt, cursorDate)] : []),
    ...(input.fieldNames && input.fieldNames.length > 0
      ? [inArray(hrmEmployeeChangeHistory.fieldName, input.fieldNames)]
      : []),
  ]

  const rows = await db
    .select({
      id: hrmEmployeeChangeHistory.id,
      fieldName: hrmEmployeeChangeHistory.fieldName,
      oldValue: hrmEmployeeChangeHistory.oldValue,
      newValue: hrmEmployeeChangeHistory.newValue,
      changedByUserId: hrmEmployeeChangeHistory.changedByUserId,
      changedAt: hrmEmployeeChangeHistory.changedAt,
      effectiveDate: hrmEmployeeChangeHistory.effectiveDate,
      reason: hrmEmployeeChangeHistory.reason,
      approvalReference: hrmEmployeeChangeHistory.approvalReference,
    })
    .from(hrmEmployeeChangeHistory)
    .where(and(...conditions))
    .orderBy(desc(hrmEmployeeChangeHistory.changedAt))
    .limit(fetchLimit)

  const hasNextPage = rows.length > limit
  const pageRows = hasNextPage ? rows.slice(0, limit) : rows

  const nextCursor =
    hasNextPage && pageRows.length > 0
      ? pageRows[pageRows.length - 1]!.changedAt.toISOString()
      : null

  return { rows: pageRows, nextCursor }
}

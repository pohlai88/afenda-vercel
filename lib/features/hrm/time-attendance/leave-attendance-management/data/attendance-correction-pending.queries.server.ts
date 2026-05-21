import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmApproval } from "#lib/db/schema"

import type { AttendanceCorrectionPendingRow } from "./attendance-list-surface.server"

const DEFAULT_LIMIT = 50

/**
 * Pending attendance-correction approvals for the org inbox (newest first).
 */
export async function listPendingAttendanceCorrectionsForOrg(
  organizationId: string,
  options: { readonly limit?: number } = {}
): Promise<AttendanceCorrectionPendingRow[]> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), 200)

  const pending = await db.query.hrmApproval.findMany({
    where: and(
      eq(hrmApproval.organizationId, organizationId),
      eq(hrmApproval.subjectKind, "attendance_correction"),
      eq(hrmApproval.state, "pending")
    ),
    columns: {
      id: true,
      subjectId: true,
      requestedAt: true,
    },
    orderBy: [desc(hrmApproval.requestedAt)],
    limit,
  })

  return pending.map((row) => ({
    id: row.id,
    subjectId: row.subjectId,
    requestedAt: row.requestedAt.toISOString().slice(0, 10),
  }))
}

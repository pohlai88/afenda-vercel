import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDepartment, hrmJobGrade, hrmPosition } from "#lib/db/schema"

export async function assertOptionalHrmPlacementFkBelongsToOrg(
  organizationId: string,
  input: {
    departmentId?: string | null
    positionId?: string | null
    gradeId?: string | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.departmentId) {
    const [d] = await db
      .select({ id: hrmDepartment.id })
      .from(hrmDepartment)
      .where(
        and(
          eq(hrmDepartment.id, input.departmentId),
          eq(hrmDepartment.organizationId, organizationId)
        )
      )
      .limit(1)
    if (!d) return { ok: false, message: "Department not found for this org." }
  }
  if (input.gradeId) {
    const [g] = await db
      .select({ id: hrmJobGrade.id })
      .from(hrmJobGrade)
      .where(
        and(
          eq(hrmJobGrade.id, input.gradeId),
          eq(hrmJobGrade.organizationId, organizationId)
        )
      )
      .limit(1)
    if (!g) return { ok: false, message: "Job grade not found for this org." }
  }
  if (input.positionId) {
    const [p] = await db
      .select({ id: hrmPosition.id })
      .from(hrmPosition)
      .where(
        and(
          eq(hrmPosition.id, input.positionId),
          eq(hrmPosition.organizationId, organizationId)
        )
      )
      .limit(1)
    if (!p) return { ok: false, message: "Position not found for this org." }
  }
  return { ok: true }
}

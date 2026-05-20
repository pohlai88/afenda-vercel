import "server-only"

import { and, asc, eq, gte, lte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmShiftAssignment, hrmShiftCoverageRequirement } from "#lib/db/schema"

export type ShiftCoverageRequirementRow = {
  readonly id: string
  readonly organizationId: string
  readonly attendanceDate: string
  readonly shiftTemplateId: string
  readonly minHeadcount: number
  readonly departmentId: string | null
  readonly locationCode: string | null
  readonly requiredSkillId: string | null
  readonly requiredPositionId: string | null
  readonly requiredTrainingCourseId: string | null
}

export type ShiftCoverageComparisonRow = ShiftCoverageRequirementRow & {
  readonly templateCode: string
  readonly templateName: string
  readonly assignedHeadcount: number
  readonly staffingStatus: "understaffed" | "met" | "overstaffed"
}

export async function listCoverageRequirementsForOrg(input: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
}): Promise<ShiftCoverageRequirementRow[]> {
  return db
    .select({
      id: hrmShiftCoverageRequirement.id,
      organizationId: hrmShiftCoverageRequirement.organizationId,
      attendanceDate: hrmShiftCoverageRequirement.attendanceDate,
      shiftTemplateId: hrmShiftCoverageRequirement.shiftTemplateId,
      minHeadcount: hrmShiftCoverageRequirement.minHeadcount,
      departmentId: hrmShiftCoverageRequirement.departmentId,
      locationCode: hrmShiftCoverageRequirement.locationCode,
      requiredSkillId: hrmShiftCoverageRequirement.requiredSkillId,
      requiredPositionId: hrmShiftCoverageRequirement.requiredPositionId,
      requiredTrainingCourseId:
        hrmShiftCoverageRequirement.requiredTrainingCourseId,
    })
    .from(hrmShiftCoverageRequirement)
    .where(
      and(
        eq(hrmShiftCoverageRequirement.organizationId, input.organizationId),
        gte(hrmShiftCoverageRequirement.attendanceDate, input.rangeStart),
        lte(hrmShiftCoverageRequirement.attendanceDate, input.rangeEnd)
      )
    )
    .orderBy(asc(hrmShiftCoverageRequirement.attendanceDate))
}

export async function compareCoverageHeadcount(input: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
}): Promise<ShiftCoverageComparisonRow[]> {
  const requirements = await listCoverageRequirementsForOrg(input)
  if (requirements.length === 0) return []

  const counts = await db
    .select({
      attendanceDate: hrmShiftAssignment.attendanceDate,
      shiftTemplateId: hrmShiftAssignment.shiftTemplateId,
      templateCode: hrmShiftAssignment.templateCode,
      templateName: hrmShiftAssignment.templateName,
      assignedHeadcount: sql<number>`count(*)::int`,
    })
    .from(hrmShiftAssignment)
    .where(
      and(
        eq(hrmShiftAssignment.organizationId, input.organizationId),
        gte(hrmShiftAssignment.attendanceDate, input.rangeStart),
        lte(hrmShiftAssignment.attendanceDate, input.rangeEnd)
      )
    )
    .groupBy(
      hrmShiftAssignment.attendanceDate,
      hrmShiftAssignment.shiftTemplateId,
      hrmShiftAssignment.templateCode,
      hrmShiftAssignment.templateName
    )

  const countByKey = new Map(
    counts.map((row) => [`${row.attendanceDate}:${row.shiftTemplateId}`, row])
  )

  return requirements.map((req) => {
    const key = `${req.attendanceDate}:${req.shiftTemplateId}`
    const countRow = countByKey.get(key)
    const assignedHeadcount = countRow?.assignedHeadcount ?? 0
    const staffingStatus =
      assignedHeadcount < req.minHeadcount
        ? ("understaffed" as const)
        : assignedHeadcount > req.minHeadcount
          ? ("overstaffed" as const)
          : ("met" as const)

    return {
      ...req,
      templateCode: countRow?.templateCode ?? "—",
      templateName: countRow?.templateName ?? "—",
      assignedHeadcount,
      staffingStatus,
    }
  })
}

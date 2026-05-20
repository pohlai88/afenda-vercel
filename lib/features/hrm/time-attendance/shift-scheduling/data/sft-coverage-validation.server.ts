import "server-only"

import { and, eq, isNull, lte, or, gte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeAssignment,
  hrmEmployeeSkill,
  hrmShiftCoverageRequirement,
  hrmTrainingRecord,
} from "#lib/db/schema"

function requirementAppliesToEmployee(input: {
  readonly requirementDepartmentId: string | null
  readonly requirementLocationCode: string | null
  readonly employeeDepartmentId: string | null
  readonly assignmentDepartmentId: string | null
  readonly assignmentLocationCode: string | null
}): boolean {
  if (
    input.requirementDepartmentId &&
    input.employeeDepartmentId !== input.requirementDepartmentId &&
    input.assignmentDepartmentId !== input.requirementDepartmentId
  ) {
    return false
  }
  if (
    input.requirementLocationCode &&
    input.assignmentLocationCode !== input.requirementLocationCode
  ) {
    return false
  }
  return true
}

export async function findCoverageViolationsForAssignment(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
  shiftTemplateId: string
}): Promise<string[]> {
  const [employeeRows, assignmentRows, requirements] = await Promise.all([
    db
      .select({
        currentDepartmentId: hrmEmployee.currentDepartmentId,
        currentPositionId: hrmEmployee.currentPositionId,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, input.organizationId),
          eq(hrmEmployee.id, input.employeeId)
        )
      )
      .limit(1),
    db
      .select({
        departmentId: hrmEmployeeAssignment.departmentId,
        workLocationCode: hrmEmployeeAssignment.workLocationCode,
      })
      .from(hrmEmployeeAssignment)
      .where(
        and(
          eq(hrmEmployeeAssignment.organizationId, input.organizationId),
          eq(hrmEmployeeAssignment.employeeId, input.employeeId),
          eq(hrmEmployeeAssignment.status, "active"),
          isNull(hrmEmployeeAssignment.effectiveTo)
        )
      )
      .limit(1),
    db
      .select({
        id: hrmShiftCoverageRequirement.id,
        requiredSkillId: hrmShiftCoverageRequirement.requiredSkillId,
        requiredPositionId: hrmShiftCoverageRequirement.requiredPositionId,
        requiredTrainingCourseId:
          hrmShiftCoverageRequirement.requiredTrainingCourseId,
        departmentId: hrmShiftCoverageRequirement.departmentId,
        locationCode: hrmShiftCoverageRequirement.locationCode,
      })
      .from(hrmShiftCoverageRequirement)
      .where(
        and(
          eq(hrmShiftCoverageRequirement.organizationId, input.organizationId),
          eq(hrmShiftCoverageRequirement.attendanceDate, input.attendanceDate),
          eq(hrmShiftCoverageRequirement.shiftTemplateId, input.shiftTemplateId)
        )
      ),
  ])

  const employee = employeeRows[0]
  const assignment = assignmentRows[0]
  if (!employee) return []

  const scoped = requirements.filter((req) =>
    requirementAppliesToEmployee({
      requirementDepartmentId: req.departmentId,
      requirementLocationCode: req.locationCode,
      employeeDepartmentId: employee.currentDepartmentId,
      assignmentDepartmentId: assignment?.departmentId ?? null,
      assignmentLocationCode: assignment?.workLocationCode ?? null,
    })
  )

  if (scoped.length === 0) return []

  const violations: string[] = []

  const skillScoped = scoped.filter((req) => req.requiredSkillId)
  if (skillScoped.length > 0) {
    const skillIds = [
      ...new Set(skillScoped.map((req) => req.requiredSkillId).filter(Boolean)),
    ] as string[]

    const skillRows = await db
      .select({ skillId: hrmEmployeeSkill.skillId })
      .from(hrmEmployeeSkill)
      .where(
        and(
          eq(hrmEmployeeSkill.organizationId, input.organizationId),
          eq(hrmEmployeeSkill.employeeId, input.employeeId),
          lte(hrmEmployeeSkill.validityFrom, input.attendanceDate),
          or(
            isNull(hrmEmployeeSkill.validityTo),
            gte(hrmEmployeeSkill.validityTo, input.attendanceDate)
          )
        )
      )

    const verifiedSkillIds = new Set(
      skillRows.map((row) => row.skillId).filter((id) => skillIds.includes(id))
    )

    for (const req of skillScoped) {
      if (!req.requiredSkillId) continue
      if (!verifiedSkillIds.has(req.requiredSkillId)) {
        violations.push(
          "Employee does not hold the required skill for this coverage slot."
        )
      }
    }
  }

  const positionScoped = scoped.filter((req) => req.requiredPositionId)
  for (const req of positionScoped) {
    if (!req.requiredPositionId) continue
    if (employee.currentPositionId !== req.requiredPositionId) {
      violations.push(
        "Employee position does not match the required role for this coverage slot."
      )
    }
  }

  const trainingScoped = scoped.filter((req) => req.requiredTrainingCourseId)
  if (trainingScoped.length > 0) {
    const courseIds = [
      ...new Set(
        trainingScoped
          .map((req) => req.requiredTrainingCourseId)
          .filter(Boolean)
      ),
    ] as string[]

    const trainingRows = await db
      .select({ courseId: hrmTrainingRecord.courseId })
      .from(hrmTrainingRecord)
      .where(
        and(
          eq(hrmTrainingRecord.organizationId, input.organizationId),
          eq(hrmTrainingRecord.employeeId, input.employeeId),
          lte(
            hrmTrainingRecord.completedAt,
            sql`${input.attendanceDate}::date`
          ),
          or(
            isNull(hrmTrainingRecord.expiresAt),
            gte(hrmTrainingRecord.expiresAt, sql`${input.attendanceDate}::date`)
          )
        )
      )

    const completedCourseIds = new Set(
      trainingRows
        .map((row) => row.courseId)
        .filter((id) => courseIds.includes(id))
    )

    for (const req of trainingScoped) {
      if (!req.requiredTrainingCourseId) continue
      if (!completedCourseIds.has(req.requiredTrainingCourseId)) {
        violations.push(
          "Employee has not completed the required training certification for this coverage slot."
        )
      }
    }
  }

  return violations
}

/** @deprecated Import `findCoverageViolationsForAssignment` instead. */
export async function findSkillCoverageViolationsForAssignment(
  input: Parameters<typeof findCoverageViolationsForAssignment>[0]
): Promise<string[]> {
  return findCoverageViolationsForAssignment(input)
}

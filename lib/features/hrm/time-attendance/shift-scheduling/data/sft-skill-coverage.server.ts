import "server-only"

import { and, eq, isNull, lte, or, gte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeAssignment,
  hrmEmployeeSkill,
  hrmShiftCoverageRequirement,
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

export async function findSkillCoverageViolationsForAssignment(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
  shiftTemplateId: string
}): Promise<string[]> {
  const [employeeRows, assignmentRows, requirements] = await Promise.all([
    db
      .select({
        currentDepartmentId: hrmEmployee.currentDepartmentId,
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

  const scoped = requirements.filter(
    (req) =>
      req.requiredSkillId &&
      requirementAppliesToEmployee({
        requirementDepartmentId: req.departmentId,
        requirementLocationCode: req.locationCode,
        employeeDepartmentId: employee.currentDepartmentId,
        assignmentDepartmentId: assignment?.departmentId ?? null,
        assignmentLocationCode: assignment?.workLocationCode ?? null,
      })
  )

  if (scoped.length === 0) return []

  const skillIds = [
    ...new Set(scoped.map((req) => req.requiredSkillId).filter(Boolean)),
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

  const violations: string[] = []
  for (const req of scoped) {
    if (!req.requiredSkillId) continue
    if (!verifiedSkillIds.has(req.requiredSkillId)) {
      violations.push(
        "Employee does not hold the required skill for this coverage slot."
      )
    }
  }

  return violations
}

import "server-only"

import { and, asc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeSkill,
  hrmSkill,
  hrmSkillCategory,
} from "#lib/db/schema"

export type SkillListRow = {
  readonly id: string
  readonly code: string
  readonly label: string
  readonly description: string | null
  readonly categoryLabel: string | null
  readonly archivedAt: Date | null
}

export type EmployeeSkillRow = {
  readonly employeeId: string
  readonly employeeLabel: string
  readonly skillId: string
  readonly skillCode: string
  readonly skillLabel: string
  readonly proficiency: number
  readonly validityFrom: string
  readonly validityTo: string | null
  readonly verifiedAt: Date | null
}

export async function listSkillsForOrg(
  organizationId: string,
  options: { includeArchived: boolean }
): Promise<readonly SkillListRow[]> {
  const rows = await db
    .select({
      id: hrmSkill.id,
      code: hrmSkill.code,
      label: hrmSkill.label,
      description: hrmSkill.description,
      categoryLabel: hrmSkillCategory.label,
      archivedAt: hrmSkill.archivedAt,
    })
    .from(hrmSkill)
    .leftJoin(hrmSkillCategory, eq(hrmSkill.categoryId, hrmSkillCategory.id))
    .where(
      options.includeArchived
        ? eq(hrmSkill.organizationId, organizationId)
        : and(
            eq(hrmSkill.organizationId, organizationId),
            isNull(hrmSkill.archivedAt)
          )
    )
    .orderBy(asc(hrmSkill.code))

  return rows
}

export async function listEmployeeSkillsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<readonly EmployeeSkillRow[]> {
  const rows = await db
    .select({
      employeeId: hrmEmployeeSkill.employeeId,
      employeeLabel: hrmEmployee.legalName,
      skillId: hrmEmployeeSkill.skillId,
      skillCode: hrmSkill.code,
      skillLabel: hrmSkill.label,
      proficiency: hrmEmployeeSkill.proficiency,
      validityFrom: hrmEmployeeSkill.validityFrom,
      validityTo: hrmEmployeeSkill.validityTo,
      verifiedAt: hrmEmployeeSkill.verifiedAt,
    })
    .from(hrmEmployeeSkill)
    .innerJoin(hrmSkill, eq(hrmEmployeeSkill.skillId, hrmSkill.id))
    .innerJoin(hrmEmployee, eq(hrmEmployeeSkill.employeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmEmployeeSkill.organizationId, organizationId),
        eq(hrmEmployeeSkill.employeeId, employeeId)
      )
    )
    .orderBy(asc(hrmSkill.code))

  return rows.map((row) => ({
    ...row,
    validityFrom: String(row.validityFrom),
    validityTo: row.validityTo ? String(row.validityTo) : null,
  }))
}

export async function listEmployeesWithSkill(
  organizationId: string,
  skillId: string
): Promise<readonly EmployeeSkillRow[]> {
  const rows = await db
    .select({
      employeeId: hrmEmployeeSkill.employeeId,
      employeeLabel: hrmEmployee.legalName,
      skillId: hrmEmployeeSkill.skillId,
      skillCode: hrmSkill.code,
      skillLabel: hrmSkill.label,
      proficiency: hrmEmployeeSkill.proficiency,
      validityFrom: hrmEmployeeSkill.validityFrom,
      validityTo: hrmEmployeeSkill.validityTo,
      verifiedAt: hrmEmployeeSkill.verifiedAt,
    })
    .from(hrmEmployeeSkill)
    .innerJoin(hrmSkill, eq(hrmEmployeeSkill.skillId, hrmSkill.id))
    .innerJoin(hrmEmployee, eq(hrmEmployeeSkill.employeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmEmployeeSkill.organizationId, organizationId),
        eq(hrmEmployeeSkill.skillId, skillId)
      )
    )
    .orderBy(asc(hrmEmployee.legalName))

  return rows.map((row) => ({
    ...row,
    validityFrom: String(row.validityFrom),
    validityTo: row.validityTo ? String(row.validityTo) : null,
  }))
}

export type SkillMatrixSkill = {
  readonly id: string
  readonly code: string
  readonly label: string
}

export type SkillMatrixRow = {
  readonly employeeId: string
  readonly employeeLabel: string
  readonly proficiencyBySkillId: Readonly<Record<string, number>>
}

export type SkillMatrixData = {
  readonly skills: readonly SkillMatrixSkill[]
  readonly rows: readonly SkillMatrixRow[]
}

const SKILL_MATRIX_SKILL_LIMIT = 12
const SKILL_MATRIX_EMPLOYEE_LIMIT = 50

export async function listSkillMatrixForOrg(
  organizationId: string
): Promise<SkillMatrixData> {
  const skills = await db
    .select({
      id: hrmSkill.id,
      code: hrmSkill.code,
      label: hrmSkill.label,
    })
    .from(hrmSkill)
    .where(
      and(
        eq(hrmSkill.organizationId, organizationId),
        isNull(hrmSkill.archivedAt)
      )
    )
    .orderBy(asc(hrmSkill.code))
    .limit(SKILL_MATRIX_SKILL_LIMIT)

  if (skills.length === 0) {
    return { skills: [], rows: [] }
  }

  const skillIds = skills.map((s) => s.id)

  const employeeRows = await db
    .selectDistinct({
      employeeId: hrmEmployeeSkill.employeeId,
      employeeLabel: hrmEmployee.legalName,
    })
    .from(hrmEmployeeSkill)
    .innerJoin(hrmEmployee, eq(hrmEmployeeSkill.employeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmEmployeeSkill.organizationId, organizationId),
        inArray(hrmEmployeeSkill.skillId, skillIds)
      )
    )
    .orderBy(asc(hrmEmployee.legalName))
    .limit(SKILL_MATRIX_EMPLOYEE_LIMIT)

  const proficiencyRows = await db
    .select({
      employeeId: hrmEmployeeSkill.employeeId,
      skillId: hrmEmployeeSkill.skillId,
      proficiency: hrmEmployeeSkill.proficiency,
    })
    .from(hrmEmployeeSkill)
    .where(
      and(
        eq(hrmEmployeeSkill.organizationId, organizationId),
        inArray(hrmEmployeeSkill.skillId, skillIds)
      )
    )

  const proficiencyMap = new Map<string, Record<string, number>>()
  for (const row of proficiencyRows) {
    const existing = proficiencyMap.get(row.employeeId) ?? {}
    existing[row.skillId] = row.proficiency
    proficiencyMap.set(row.employeeId, existing)
  }

  return {
    skills,
    rows: employeeRows.map((employee) => ({
      employeeId: employee.employeeId,
      employeeLabel: employee.employeeLabel,
      proficiencyBySkillId: proficiencyMap.get(employee.employeeId) ?? {},
    })),
  }
}

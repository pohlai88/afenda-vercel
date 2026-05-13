import "server-only"

import { and, asc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmDepartment,
  hrmEmployee,
  hrmJobGrade,
  hrmPosition,
} from "#lib/db/schema"

export type DepartmentListRow = {
  id: string
  code: string
  name: string
  parentDepartmentId: string | null
  archivedAt: Date | null
}

export type JobGradeListRow = {
  id: string
  code: string
  name: string
  archivedAt: Date | null
}

export type PositionListRow = {
  id: string
  code: string
  title: string
  departmentId: string
  departmentCode: string | null
  defaultGradeId: string | null
  archivedAt: Date | null
}

export async function listDepartmentsForOrg(
  organizationId: string,
  options: { includeArchived: boolean }
): Promise<DepartmentListRow[]> {
  const rows = await db
    .select({
      id: hrmDepartment.id,
      code: hrmDepartment.code,
      name: hrmDepartment.name,
      parentDepartmentId: hrmDepartment.parentDepartmentId,
      archivedAt: hrmDepartment.archivedAt,
    })
    .from(hrmDepartment)
    .where(
      options.includeArchived
        ? eq(hrmDepartment.organizationId, organizationId)
        : and(
            eq(hrmDepartment.organizationId, organizationId),
            isNull(hrmDepartment.archivedAt)
          )
    )
    .orderBy(asc(hrmDepartment.code))

  return rows
}

export async function listJobGradesForOrg(
  organizationId: string,
  options: { includeArchived: boolean }
): Promise<JobGradeListRow[]> {
  const rows = await db
    .select({
      id: hrmJobGrade.id,
      code: hrmJobGrade.code,
      name: hrmJobGrade.name,
      archivedAt: hrmJobGrade.archivedAt,
    })
    .from(hrmJobGrade)
    .where(
      options.includeArchived
        ? eq(hrmJobGrade.organizationId, organizationId)
        : and(
            eq(hrmJobGrade.organizationId, organizationId),
            isNull(hrmJobGrade.archivedAt)
          )
    )
    .orderBy(asc(hrmJobGrade.code))

  return rows
}

export async function listPositionsForOrg(
  organizationId: string,
  options: { includeArchived: boolean }
): Promise<PositionListRow[]> {
  const pos = await db
    .select({
      id: hrmPosition.id,
      code: hrmPosition.code,
      title: hrmPosition.title,
      departmentId: hrmPosition.departmentId,
      defaultGradeId: hrmPosition.defaultGradeId,
      archivedAt: hrmPosition.archivedAt,
    })
    .from(hrmPosition)
    .where(
      options.includeArchived
        ? eq(hrmPosition.organizationId, organizationId)
        : and(
            eq(hrmPosition.organizationId, organizationId),
            isNull(hrmPosition.archivedAt)
          )
    )
    .orderBy(asc(hrmPosition.code))

  const deptIds = [...new Set(pos.map((p) => p.departmentId))]
  const depts =
    deptIds.length > 0
      ? await db.query.hrmDepartment.findMany({
          where: and(
            eq(hrmDepartment.organizationId, organizationId),
            inArray(hrmDepartment.id, deptIds)
          ),
          columns: { id: true, code: true },
        })
      : []
  const deptMap = new Map(depts.map((d) => [d.id, d.code]))

  return pos.map((p) => ({
    ...p,
    departmentCode: deptMap.get(p.departmentId) ?? null,
  }))
}

export async function countEmployeesUsingDepartment(
  organizationId: string,
  departmentId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.currentDepartmentId, departmentId),
        isNull(hrmEmployee.archivedAt)
      )
    )
  return rows.length
}

export async function countActivePositionsInDepartment(
  organizationId: string,
  departmentId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmPosition.id })
    .from(hrmPosition)
    .where(
      and(
        eq(hrmPosition.organizationId, organizationId),
        eq(hrmPosition.departmentId, departmentId),
        isNull(hrmPosition.archivedAt)
      )
    )
  return rows.length
}

export async function countEmployeesUsingPosition(
  organizationId: string,
  positionId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.currentPositionId, positionId),
        isNull(hrmEmployee.archivedAt)
      )
    )
  return rows.length
}

export async function countEmployeesUsingGrade(
  organizationId: string,
  gradeId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.currentJobGradeId, gradeId),
        isNull(hrmEmployee.archivedAt)
      )
    )
  return rows.length
}

export async function countPositionsUsingDefaultGrade(
  organizationId: string,
  gradeId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmPosition.id })
    .from(hrmPosition)
    .where(
      and(
        eq(hrmPosition.organizationId, organizationId),
        eq(hrmPosition.defaultGradeId, gradeId),
        isNull(hrmPosition.archivedAt)
      )
    )
  return rows.length
}

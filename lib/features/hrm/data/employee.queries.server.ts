import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import type { EmployeeDetailRow, EmployeeRow } from "../types"

/** Active + archived employees — newest activity first. Tenant guard at call site. */
export async function listEmployeesForOrganization(
  organizationId: string
): Promise<EmployeeRow[]> {
  return db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      preferredName: hrmEmployee.preferredName,
      email: hrmEmployee.email,
      archivedAt: hrmEmployee.archivedAt,
    })
    .from(hrmEmployee)
    .where(eq(hrmEmployee.organizationId, organizationId))
    .orderBy(desc(hrmEmployee.updatedAt))
}

export async function getEmployeeForOrganization(
  organizationId: string,
  employeeId: string
): Promise<EmployeeDetailRow | null> {
  const [row] = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      preferredName: hrmEmployee.preferredName,
      email: hrmEmployee.email,
      phone: hrmEmployee.phone,
      archivedAt: hrmEmployee.archivedAt,
      archivedReason: hrmEmployee.archivedReason,
      updatedAt: hrmEmployee.updatedAt,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      currentPositionId: hrmEmployee.currentPositionId,
      currentJobGradeId: hrmEmployee.currentJobGradeId,
      currentEmploymentContractId: hrmEmployee.currentEmploymentContractId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, employeeId)
      )
    )
    .limit(1)

  return row ?? null
}

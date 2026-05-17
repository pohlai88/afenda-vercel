import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import type { EmployeeDetailRow, EmployeeRow } from "../../../types"

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
      employmentStatus: hrmEmployee.employmentStatus,
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
      dateOfBirth: hrmEmployee.dateOfBirth,
      gender: hrmEmployee.gender,
      nationality: hrmEmployee.nationality,
      idDocumentType: hrmEmployee.idDocumentType,
      idDocumentNumber: hrmEmployee.idDocumentNumber,
      address: hrmEmployee.address,
      countryCode: hrmEmployee.countryCode,
      workStateCode: hrmEmployee.workStateCode,
      linkedUserId: hrmEmployee.linkedUserId,
      employmentStatus: hrmEmployee.employmentStatus,
      employmentStartDate: hrmEmployee.employmentStartDate,
      probationEndDate: hrmEmployee.probationEndDate,
      confirmationDate: hrmEmployee.confirmationDate,
      archivedAt: hrmEmployee.archivedAt,
      archivedReason: hrmEmployee.archivedReason,
      updatedAt: hrmEmployee.updatedAt,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      currentPositionId: hrmEmployee.currentPositionId,
      currentJobGradeId: hrmEmployee.currentJobGradeId,
      managerEmployeeId: hrmEmployee.managerEmployeeId,
      dottedLineManagerId: hrmEmployee.dottedLineManagerId,
      hrOwnerEmployeeId: hrmEmployee.hrOwnerEmployeeId,
      employmentType: hrmEmployee.employmentType,
      workerCategory: hrmEmployee.workerCategory,
      employeeLevel: hrmEmployee.employeeLevel,
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

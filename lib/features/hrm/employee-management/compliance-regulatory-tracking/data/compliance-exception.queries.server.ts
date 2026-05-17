import "server-only"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmComplianceException, hrmEmployee } from "#lib/db/schema"

import { OPEN_EXCEPTION_STATUSES } from "./compliance-exception.mutations.server"
import type { ComplianceExceptionFilterInput } from "../schemas/compliance-exception.schema"

export type ComplianceExceptionListRow = {
  readonly id: string
  readonly employeeId: string | null
  readonly employeeNumber: string | null
  readonly legalName: string | null
  readonly complianceArea: string
  readonly itemType: string
  readonly title: string
  readonly severity: string
  readonly status: string
  readonly correctiveActionDueDate: Date | null
  readonly createdAt: Date
}

export async function listComplianceExceptionsForOrg(
  organizationId: string,
  filter: ComplianceExceptionFilterInput = {}
): Promise<ComplianceExceptionListRow[]> {
  const predicates = [
    eq(hrmComplianceException.organizationId, organizationId),
    isNull(hrmComplianceException.resolvedAt),
    isNull(hrmComplianceException.waivedAt),
  ]

  if (filter.status) {
    predicates.push(eq(hrmComplianceException.status, filter.status))
  } else {
    predicates.push(
      inArray(hrmComplianceException.status, [...OPEN_EXCEPTION_STATUSES])
    )
  }
  if (filter.complianceArea) {
    predicates.push(
      eq(hrmComplianceException.complianceArea, filter.complianceArea)
    )
  }
  if (filter.employeeId) {
    predicates.push(eq(hrmComplianceException.employeeId, filter.employeeId))
  }

  const rows = await db
    .select({
      id: hrmComplianceException.id,
      employeeId: hrmComplianceException.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      complianceArea: hrmComplianceException.complianceArea,
      itemType: hrmComplianceException.itemType,
      title: hrmComplianceException.title,
      severity: hrmComplianceException.severity,
      status: hrmComplianceException.status,
      correctiveActionDueDate:
        hrmComplianceException.correctiveActionDueDate,
      createdAt: hrmComplianceException.createdAt,
    })
    .from(hrmComplianceException)
    .leftJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmComplianceException.employeeId)
    )
    .where(and(...predicates))
    .orderBy(desc(hrmComplianceException.createdAt))
    .limit(100)

  return rows
}

import "server-only"

import { and, desc, eq, inArray, isNull, lte } from "drizzle-orm"

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
  readonly sourceReferenceId: string | null
  readonly title: string
  readonly severity: string
  readonly status: string
  readonly correctiveActionOwnerUserId: string | null
  readonly correctiveActionDueDate: Date | null
  readonly correctiveActionDescription: string | null
  readonly correctiveActionProgressNote: string | null
  readonly correctiveActionEvidenceDocumentId: string | null
  readonly correctiveActionUpdatedAt: Date | null
  readonly resolutionNote: string | null
  readonly resolvedEvidenceDocumentId: string | null
  readonly waivedAt: Date | null
  readonly waiverReason: string | null
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
  if (filter.correctiveActionOwnerUserId) {
    predicates.push(
      eq(
        hrmComplianceException.correctiveActionOwnerUserId,
        filter.correctiveActionOwnerUserId
      )
    )
  }
  if (filter.overdueAsOf) {
    predicates.push(
      lte(
        hrmComplianceException.correctiveActionDueDate,
        new Date(`${filter.overdueAsOf}T00:00:00.000Z`)
      )
    )
  }

  const rows = await db
    .select({
      id: hrmComplianceException.id,
      employeeId: hrmComplianceException.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      complianceArea: hrmComplianceException.complianceArea,
      itemType: hrmComplianceException.itemType,
      sourceReferenceId: hrmComplianceException.sourceReferenceId,
      title: hrmComplianceException.title,
      severity: hrmComplianceException.severity,
      status: hrmComplianceException.status,
      correctiveActionOwnerUserId:
        hrmComplianceException.correctiveActionOwnerUserId,
      correctiveActionDueDate:
        hrmComplianceException.correctiveActionDueDate,
      correctiveActionDescription:
        hrmComplianceException.correctiveActionDescription,
      correctiveActionProgressNote:
        hrmComplianceException.correctiveActionProgressNote,
      correctiveActionEvidenceDocumentId:
        hrmComplianceException.correctiveActionEvidenceDocumentId,
      correctiveActionUpdatedAt:
        hrmComplianceException.correctiveActionUpdatedAt,
      resolutionNote: hrmComplianceException.resolutionNote,
      resolvedEvidenceDocumentId:
        hrmComplianceException.resolvedEvidenceDocumentId,
      waivedAt: hrmComplianceException.waivedAt,
      waiverReason: hrmComplianceException.waiverReason,
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

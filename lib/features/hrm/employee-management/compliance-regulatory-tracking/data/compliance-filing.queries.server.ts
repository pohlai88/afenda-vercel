import "server-only"

import { and, asc, desc, eq, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmComplianceFiling } from "#lib/db/schema"

import type { ComplianceFilingFilterInput } from "../schemas/compliance-filing.schema"
import { deriveFilingComplianceStatus } from "./compliance-status.shared"

export type ComplianceFilingListRow = {
  readonly id: string
  readonly title: string
  readonly filingCategory: string
  readonly countryCode: string | null
  readonly legalEntityCode: string | null
  readonly legalEntityName: string | null
  readonly workLocationCode: string | null
  readonly employmentType: string | null
  readonly workerCategory: string | null
  readonly filingAuthority: string | null
  readonly referenceCode: string | null
  readonly dueDate: Date
  readonly coveragePeriod: string | null
  readonly status: string
  readonly derivedStatus: string
  readonly submittedAt: Date | null
  readonly confirmedAt: Date | null
  readonly confirmationReference: string | null
  readonly evidenceDocumentId: string | null
  readonly waivedAt: Date | null
  readonly waiverReason: string | null
  readonly createdAt: Date
}

export async function listComplianceFilingsForOrg(
  organizationId: string,
  filter: ComplianceFilingFilterInput = {}
): Promise<ComplianceFilingListRow[]> {
  const predicates = [eq(hrmComplianceFiling.organizationId, organizationId)]

  if (filter.status) {
    predicates.push(eq(hrmComplianceFiling.status, filter.status))
  }
  if (filter.filingCategory) {
    predicates.push(
      eq(hrmComplianceFiling.filingCategory, filter.filingCategory)
    )
  }
  if (filter.countryCode) {
    predicates.push(eq(hrmComplianceFiling.countryCode, filter.countryCode))
  }
  if (filter.coveragePeriod) {
    predicates.push(
      eq(hrmComplianceFiling.coveragePeriod, filter.coveragePeriod)
    )
  }
  if (filter.dueOnOrBefore) {
    predicates.push(
      lte(
        hrmComplianceFiling.dueDate,
        new Date(`${filter.dueOnOrBefore}T00:00:00.000Z`)
      )
    )
  }

  const now = new Date()
  const rows = await db
    .select()
    .from(hrmComplianceFiling)
    .where(and(...predicates))
    .orderBy(
      asc(hrmComplianceFiling.dueDate),
      desc(hrmComplianceFiling.createdAt)
    )

  return rows.map((row) => ({
    ...row,
    derivedStatus: deriveFilingComplianceStatus({
      status: row.status,
      dueDate: row.dueDate,
      now,
    }),
  }))
}

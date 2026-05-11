import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmploymentContract } from "#lib/db/schema"

import type { EmploymentContractSummary } from "../types"

export async function listEmploymentContractsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<EmploymentContractSummary[]> {
  return db
    .select({
      id: hrmEmploymentContract.id,
      versionNumber: hrmEmploymentContract.versionNumber,
      contractType: hrmEmploymentContract.contractType,
      state: hrmEmploymentContract.state,
      effectiveFrom: hrmEmploymentContract.effectiveFrom,
      effectiveTo: hrmEmploymentContract.effectiveTo,
      signedDocumentId: hrmEmploymentContract.signedDocumentId,
      baseSalaryAmount: hrmEmploymentContract.baseSalaryAmount,
      baseSalaryCurrency: hrmEmploymentContract.baseSalaryCurrency,
      payFrequency: hrmEmploymentContract.payFrequency,
    })
    .from(hrmEmploymentContract)
    .where(
      and(
        eq(hrmEmploymentContract.organizationId, organizationId),
        eq(hrmEmploymentContract.employeeId, employeeId)
      )
    )
    .orderBy(desc(hrmEmploymentContract.versionNumber))
}

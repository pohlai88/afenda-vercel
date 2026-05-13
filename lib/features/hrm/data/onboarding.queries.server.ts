import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmEmploymentContract } from "#lib/db/schema"

export type OnboardingContractRow = {
  contractId: string
  employeeId: string
  legalName: string
  onboardingChecklist: unknown
}

export async function listActiveContractsForOnboardingDashboard(
  organizationId: string
): Promise<readonly OnboardingContractRow[]> {
  const rows = await db
    .select({
      contractId: hrmEmploymentContract.id,
      employeeId: hrmEmploymentContract.employeeId,
      legalName: hrmEmployee.legalName,
      onboardingChecklist: hrmEmploymentContract.onboardingChecklist,
    })
    .from(hrmEmploymentContract)
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmEmploymentContract.employeeId)
    )
    .where(
      and(
        eq(hrmEmploymentContract.organizationId, organizationId),
        eq(hrmEmploymentContract.state, "active"),
        isNull(hrmEmployee.archivedAt)
      )
    )
    .orderBy(hrmEmployee.legalName)

  return rows
}

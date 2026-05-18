import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollProfile } from "#lib/db/schema"

import { resolveEmployeeOrgContextReference } from "../../../employee-management/employee-records-management/data/employee-org-context.queries.server"
import { readPayrollProfileLegalEntityCode } from "../../multi-country-payroll/data/payroll-profile-legal-entity.shared"

/**
 * Canonical legal-entity code for claim fund eligibility:
 * 1. Org placement chain (`legal_entity` org unit above employee department)
 * 2. Active payroll profile `statutoryProfileExtras.legalEntityCode`
 */
export async function resolveClaimEmployeeLegalEntityCode(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly currentDepartmentId: string | null
  readonly countryCode: string | null
}): Promise<string | null> {
  const orgContext = await resolveEmployeeOrgContextReference({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    departmentId: input.currentDepartmentId,
  })
  const fromPlacement = orgContext.legalEntity?.code?.trim()
  if (fromPlacement) return fromPlacement

  const [profile] = await db
    .select({
      statutoryProfileExtras: hrmPayrollProfile.statutoryProfileExtras,
      countryCode: hrmPayrollProfile.countryCode,
    })
    .from(hrmPayrollProfile)
    .where(
      and(
        eq(hrmPayrollProfile.organizationId, input.organizationId),
        eq(hrmPayrollProfile.employeeId, input.employeeId),
        ...(input.countryCode
          ? [eq(hrmPayrollProfile.countryCode, input.countryCode.toUpperCase())]
          : []),
        isNull(hrmPayrollProfile.effectiveTo)
      )
    )
    .limit(1)

  return readPayrollProfileLegalEntityCode(profile?.statutoryProfileExtras ?? null)
}

export type ClaimEmployeeEligibilityProjection = {
  readonly id: string
  readonly archivedAt: Date | null
  readonly employmentStatus: string | null
  readonly employmentType: string | null
  readonly countryCode: string | null
  readonly legalEntityCode: string | null
  readonly currentDepartmentId: string | null
  readonly currentJobGradeId: string | null
  readonly workStateCode: string | null
}

export async function buildClaimEmployeeEligibilityProjection(input: {
  readonly organizationId: string
  readonly employee: {
    readonly id: string
    readonly archivedAt: Date | null
    readonly employmentStatus: string | null
    readonly employmentType: string | null
    readonly countryCode: string | null
    readonly currentDepartmentId: string | null
    readonly currentJobGradeId: string | null
    readonly workStateCode: string | null
  }
}): Promise<ClaimEmployeeEligibilityProjection> {
  const legalEntityCode = await resolveClaimEmployeeLegalEntityCode({
    organizationId: input.organizationId,
    employeeId: input.employee.id,
    currentDepartmentId: input.employee.currentDepartmentId,
    countryCode: input.employee.countryCode,
  })

  return {
    ...input.employee,
    legalEntityCode,
  }
}

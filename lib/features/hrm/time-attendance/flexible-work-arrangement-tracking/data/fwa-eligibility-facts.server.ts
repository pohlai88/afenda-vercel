import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeAssignment,
  hrmPayrollProfile,
} from "#lib/db/schema"

export type FwaEligibilityEmployeeFacts = {
  departmentId: string | null
  jobGradeId: string | null
  positionId: string | null
  workLocationCode: string | null
  employmentType: string | null
  countryCode: string | null
  workerCategory: string | null
  legalEntityCode: string | null
  policyGroupCode: string | null
}

function readLegalEntityCodeFromPayrollExtras(
  extras: unknown
): string | null {
  if (!extras || typeof extras !== "object") return null
  const raw = (extras as Record<string, unknown>).legalEntityCode
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null
}

/** Employee facts used to evaluate flexible-work eligibility rules (HRM-FWA-003/007). */
export async function resolveFwaEligibilityEmployeeFacts(input: {
  organizationId: string
  employeeId: string
}): Promise<FwaEligibilityEmployeeFacts> {
  const [assignment, employeeRow, payrollProfile] = await Promise.all([
    db.query.hrmEmployeeAssignment.findFirst({
      where: and(
        eq(hrmEmployeeAssignment.organizationId, input.organizationId),
        eq(hrmEmployeeAssignment.employeeId, input.employeeId),
        eq(hrmEmployeeAssignment.status, "active"),
        isNull(hrmEmployeeAssignment.effectiveTo)
      ),
      columns: {
        departmentId: true,
        jobGradeId: true,
        positionId: true,
        workLocationCode: true,
      },
      orderBy: [desc(hrmEmployeeAssignment.effectiveFrom)],
    }),
    db.query.hrmEmployee.findFirst({
      where: and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      ),
      columns: {
        employmentType: true,
        countryCode: true,
        workerCategory: true,
      },
    }),
    db.query.hrmPayrollProfile.findFirst({
      where: and(
        eq(hrmPayrollProfile.organizationId, input.organizationId),
        eq(hrmPayrollProfile.employeeId, input.employeeId),
        isNull(hrmPayrollProfile.effectiveTo)
      ),
      columns: {
        payrollGroupCode: true,
        statutoryProfileExtras: true,
      },
      orderBy: [desc(hrmPayrollProfile.effectiveFrom)],
    }),
  ])

  return {
    departmentId: assignment?.departmentId ?? null,
    jobGradeId: assignment?.jobGradeId ?? null,
    positionId: assignment?.positionId ?? null,
    workLocationCode: assignment?.workLocationCode ?? null,
    employmentType: employeeRow?.employmentType ?? null,
    countryCode: employeeRow?.countryCode ?? null,
    workerCategory: employeeRow?.workerCategory ?? null,
    legalEntityCode: readLegalEntityCodeFromPayrollExtras(
      payrollProfile?.statutoryProfileExtras
    ),
    policyGroupCode: payrollProfile?.payrollGroupCode ?? null,
  }
}

export function fwaEligibilityRuleMatchesFacts(
  rule: {
    departmentId: string | null
    jobGradeId: string | null
    employmentType: string | null
    legalEntityCode: string | null
    countryCode: string | null
    workLocationCode: string | null
    positionId: string | null
    workerCategory: string | null
    policyGroupCode: string | null
  },
  facts: FwaEligibilityEmployeeFacts
): boolean {
  if (rule.departmentId && rule.departmentId !== facts.departmentId) {
    return false
  }
  if (rule.jobGradeId && rule.jobGradeId !== facts.jobGradeId) {
    return false
  }
  if (rule.employmentType && rule.employmentType !== facts.employmentType) {
    return false
  }
  if (rule.legalEntityCode && rule.legalEntityCode !== facts.legalEntityCode) {
    return false
  }
  if (rule.countryCode && rule.countryCode !== facts.countryCode) {
    return false
  }
  if (
    rule.workLocationCode &&
    rule.workLocationCode !== facts.workLocationCode
  ) {
    return false
  }
  if (rule.positionId && rule.positionId !== facts.positionId) {
    return false
  }
  if (rule.workerCategory && rule.workerCategory !== facts.workerCategory) {
    return false
  }
  if (rule.policyGroupCode && rule.policyGroupCode !== facts.policyGroupCode) {
    return false
  }
  return true
}

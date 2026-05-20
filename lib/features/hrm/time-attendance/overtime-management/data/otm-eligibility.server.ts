import "server-only"

import { and, asc, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmOvertimeEligibilityRule, hrmOvertimeType } from "#lib/db/schema"

import { HRM_OTM_AUDIT } from "../otm.contract"
import type { OtmEmployeeContextRow } from "./otm.types.shared"
import {
  otmEligibilityRuleMatchesFacts,
  resolveOtmEligibilityEmployeeFacts,
} from "./otm-eligibility-facts.server"
import { revalidateOtmSurfaces } from "./otm-revalidate.server"

import type { OtmEligibilityRuleRow } from "./otm.types.shared"

export type { OtmEligibilityRuleRow } from "./otm.types.shared"

function normalizeCountryCode(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toUpperCase()
  if (!trimmed) return null
  if (!/^[A-Z]{2}$/.test(trimmed)) return null
  return trimmed
}

export async function listOtmEligibilityRulesForOrg(
  organizationId: string
): Promise<OtmEligibilityRuleRow[]> {
  const rules = await db.query.hrmOvertimeEligibilityRule.findMany({
    where: eq(hrmOvertimeEligibilityRule.organizationId, organizationId),
    orderBy: [asc(hrmOvertimeEligibilityRule.createdAt)],
  })

  if (rules.length === 0) return []

  const typeIds = [...new Set(rules.map((rule) => rule.overtimeTypeId))]
  const types = await db.query.hrmOvertimeType.findMany({
    where: and(
      eq(hrmOvertimeType.organizationId, organizationId),
      inArray(hrmOvertimeType.id, typeIds)
    ),
    columns: { id: true, label: true },
  })
  const typeMap = new Map(types.map((type) => [type.id, type.label]))

  return rules.map((rule) => ({
    id: rule.id,
    overtimeTypeId: rule.overtimeTypeId,
    overtimeTypeLabel: typeMap.get(rule.overtimeTypeId) ?? rule.overtimeTypeId,
    departmentId: rule.departmentId,
    jobGradeId: rule.jobGradeId,
    employmentType: rule.employmentType,
    legalEntityCode: rule.legalEntityCode,
    countryCode: rule.countryCode,
    workLocationCode: rule.workLocationCode,
    positionId: rule.positionId,
    workerCategory: rule.workerCategory,
    policyGroupCode: rule.policyGroupCode,
    allowException: rule.allowException,
    isActive: rule.isActive,
  }))
}

export async function createOtmEligibilityRule(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  overtimeTypeId: string
  departmentId: string | null
  jobGradeId: string | null
  employmentType: string | null
  legalEntityCode: string | null
  countryCode: string | null
  workLocationCode: string | null
  positionId: string | null
  workerCategory: string | null
  policyGroupCode: string | null
  allowException: boolean
}): Promise<
  | { ok: true; ruleId: string }
  | { ok: false; errors: { form?: string } }
> {
  const countryCode = normalizeCountryCode(input.countryCode)
  const id = crypto.randomUUID()

  await db.insert(hrmOvertimeEligibilityRule).values({
    id,
    organizationId: input.organizationId,
    overtimeTypeId: input.overtimeTypeId,
    departmentId: input.departmentId,
    jobGradeId: input.jobGradeId,
    employmentType: input.employmentType,
    legalEntityCode: input.legalEntityCode?.trim() || null,
    countryCode,
    workLocationCode: input.workLocationCode?.trim() || null,
    positionId: input.positionId,
    workerCategory: input.workerCategory?.trim() || null,
    policyGroupCode: input.policyGroupCode?.trim() || null,
    allowException: input.allowException,
    isActive: true,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.eligibilityRuleCreate,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_overtime_eligibility_rule",
    resourceId: id,
    metadata: {
      overtimeTypeId: input.overtimeTypeId,
      allowException: input.allowException,
    },
  })

  revalidateOtmSurfaces()
  return { ok: true, ruleId: id }
}

export type OtmEligibilityResult =
  | { eligible: true }
  | {
      eligible: false
      reason: string
      allowException: boolean
    }

export async function validateOtmEmployeeEligibility(input: {
  organizationId: string
  overtimeTypeId: string
  employee: OtmEmployeeContextRow
}): Promise<OtmEligibilityResult> {
  const rules = await db.query.hrmOvertimeEligibilityRule.findMany({
    where: and(
      eq(hrmOvertimeEligibilityRule.organizationId, input.organizationId),
      eq(hrmOvertimeEligibilityRule.overtimeTypeId, input.overtimeTypeId),
      eq(hrmOvertimeEligibilityRule.isActive, true)
    ),
  })

  if (rules.length === 0) {
    return { eligible: true }
  }

  const facts = await resolveOtmEligibilityEmployeeFacts({
    organizationId: input.organizationId,
    employeeId: input.employee.id,
  })

  const matched = rules.some((rule) =>
    otmEligibilityRuleMatchesFacts(rule, facts)
  )

  if (matched) {
    return { eligible: true }
  }

  return {
    eligible: false,
    reason: "Employee does not meet eligibility rules for this overtime type.",
    allowException: rules.some((rule) => rule.allowException),
  }
}

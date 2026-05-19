import "server-only"

import { and, asc, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmFlexibleWorkArrangementType,
  hrmFlexibleWorkEligibilityRule,
} from "#lib/db/schema"

import { HRM_FWA_AUDIT } from "../fwa.contract"
import type { FwaEmployeeContextRow } from "./fwa.queries.server"
import {
  fwaEligibilityRuleMatchesFacts,
  resolveFwaEligibilityEmployeeFacts,
} from "./fwa-eligibility-facts.server"
import { revalidateFwaSurfaces } from "./fwa-revalidate.server"

import type { FwaEligibilityRuleRow } from "./fwa.types.shared"

export type { FwaEligibilityRuleRow } from "./fwa.types.shared"

function normalizeCountryCode(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toUpperCase()
  if (!trimmed) return null
  if (!/^[A-Z]{2}$/.test(trimmed)) return null
  return trimmed
}

export async function listFwaEligibilityRulesForOrg(
  organizationId: string
): Promise<FwaEligibilityRuleRow[]> {
  const rules = await db.query.hrmFlexibleWorkEligibilityRule.findMany({
    where: eq(hrmFlexibleWorkEligibilityRule.organizationId, organizationId),
    orderBy: [asc(hrmFlexibleWorkEligibilityRule.createdAt)],
  })

  if (rules.length === 0) return []

  const typeIds = [...new Set(rules.map((rule) => rule.arrangementTypeId))]
  const types = await db.query.hrmFlexibleWorkArrangementType.findMany({
    where: and(
      eq(hrmFlexibleWorkArrangementType.organizationId, organizationId),
      inArray(hrmFlexibleWorkArrangementType.id, typeIds)
    ),
    columns: { id: true, label: true },
  })
  const typeMap = new Map(types.map((type) => [type.id, type.label]))

  return rules.map((rule) => ({
    id: rule.id,
    arrangementTypeId: rule.arrangementTypeId,
    arrangementTypeLabel: typeMap.get(rule.arrangementTypeId) ?? rule.arrangementTypeId,
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

export async function createFwaEligibilityRule(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  arrangementTypeId: string
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
}): Promise<{ ok: true; ruleId: string } | { ok: false; form?: string }> {
  const countryCode = normalizeCountryCode(input.countryCode)
  if (input.countryCode?.trim() && !countryCode) {
    return {
      ok: false,
      form: "Country code must be a two-letter ISO code (e.g. MY).",
    }
  }

  const id = crypto.randomUUID()
  await db.insert(hrmFlexibleWorkEligibilityRule).values({
    id,
    organizationId: input.organizationId,
    arrangementTypeId: input.arrangementTypeId,
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
    action: HRM_FWA_AUDIT.eligibilityRuleCreate,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_flexible_work_eligibility_rule",
    resourceId: id,
    metadata: {
      arrangementTypeId: input.arrangementTypeId,
      allowException: input.allowException,
    },
  })

  revalidateFwaSurfaces()
  return { ok: true, ruleId: id }
}

export type FwaEligibilityResult =
  | { eligible: true }
  | {
      eligible: false
      reason: string
      allowException: boolean
    }

/**
 * Validates employee eligibility for an arrangement type (HRM-FWA-007/008).
 * When no rules exist for the type, all active employees are eligible.
 */
export async function validateFwaEmployeeEligibility(input: {
  organizationId: string
  arrangementTypeId: string
  employee: FwaEmployeeContextRow
}): Promise<FwaEligibilityResult> {
  const rules = await db.query.hrmFlexibleWorkEligibilityRule.findMany({
    where: and(
      eq(hrmFlexibleWorkEligibilityRule.organizationId, input.organizationId),
      eq(
        hrmFlexibleWorkEligibilityRule.arrangementTypeId,
        input.arrangementTypeId
      ),
      eq(hrmFlexibleWorkEligibilityRule.isActive, true)
    ),
  })

  if (rules.length === 0) {
    return { eligible: true }
  }

  const facts = await resolveFwaEligibilityEmployeeFacts({
    organizationId: input.organizationId,
    employeeId: input.employee.id,
  })

  const matched = rules.some((rule) =>
    fwaEligibilityRuleMatchesFacts(rule, facts)
  )

  if (matched) {
    return { eligible: true }
  }

  const allowException = rules.some((rule) => rule.allowException)

  return {
    eligible: false,
    reason:
      "Employee does not meet eligibility rules for this arrangement type.",
    allowException,
  }
}

import "server-only"

import { and, asc, eq, inArray, isNull, or, lte, gte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmOvertimeRateRule, hrmOvertimeType } from "#lib/db/schema"

import type { OtmRateRuleRow } from "./otm.types.shared"

export type { OtmRateRuleRow } from "./otm.types.shared"

export async function listOtmRateRulesForOrg(
  organizationId: string
): Promise<OtmRateRuleRow[]> {
  const rules = await db.query.hrmOvertimeRateRule.findMany({
    where: and(
      eq(hrmOvertimeRateRule.organizationId, organizationId),
      eq(hrmOvertimeRateRule.isActive, true)
    ),
    orderBy: [asc(hrmOvertimeRateRule.createdAt)],
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
    multiplierHundredths: rule.multiplierHundredths,
    countryCode: rule.countryCode,
    workerCategory: rule.workerCategory,
    earningCode: rule.earningCode,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    isActive: rule.isActive,
  }))
}

export async function resolveOtmRateMultiplierHundredths(input: {
  organizationId: string
  overtimeTypeId: string | null
  workDate: string
  countryCode: string | null
  workerCategory: string | null
}): Promise<{ multiplierHundredths: number; earningCode: string | null }> {
  if (!input.overtimeTypeId) {
    return { multiplierHundredths: 100, earningCode: null }
  }

  const rules = await db
    .select()
    .from(hrmOvertimeRateRule)
    .where(
      and(
        eq(hrmOvertimeRateRule.organizationId, input.organizationId),
        eq(hrmOvertimeRateRule.overtimeTypeId, input.overtimeTypeId),
        eq(hrmOvertimeRateRule.isActive, true),
        or(
          isNull(hrmOvertimeRateRule.effectiveFrom),
          lte(hrmOvertimeRateRule.effectiveFrom, input.workDate)
        ),
        or(
          isNull(hrmOvertimeRateRule.effectiveTo),
          gte(hrmOvertimeRateRule.effectiveTo, input.workDate)
        )
      )
    )

  const matched =
    rules.find(
      (rule) =>
        (rule.countryCode == null ||
          rule.countryCode === input.countryCode) &&
        (rule.workerCategory == null ||
          rule.workerCategory === input.workerCategory)
    ) ?? rules[0]

  if (!matched) {
    return { multiplierHundredths: 100, earningCode: null }
  }

  return {
    multiplierHundredths: matched.multiplierHundredths,
    earningCode: matched.earningCode,
  }
}

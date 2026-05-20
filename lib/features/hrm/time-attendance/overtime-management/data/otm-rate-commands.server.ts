import "server-only"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmOvertimeRateRule } from "#lib/db/schema"

import { HRM_OTM_AUDIT } from "../otm.contract"
import { revalidateOtmSurfaces } from "./otm-revalidate.server"

export async function createOtmRateRule(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  overtimeTypeId: string
  multiplierHundredths: number
  countryCode: string | null
  workerCategory: string | null
  earningCode: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
}): Promise<
  | { ok: true; ruleId: string }
  | { ok: false; errors: { form?: string } }
> {
  const id = crypto.randomUUID()

  await db.insert(hrmOvertimeRateRule).values({
    id,
    organizationId: input.organizationId,
    overtimeTypeId: input.overtimeTypeId,
    multiplierHundredths: input.multiplierHundredths,
    countryCode: input.countryCode,
    workerCategory: input.workerCategory,
    earningCode: input.earningCode,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    createdByUserId: input.userId,
    updatedByUserId: input.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.rateRuleCreate,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_overtime_rate_rule",
    resourceId: id,
    metadata: {
      overtimeTypeId: input.overtimeTypeId,
      multiplierHundredths: input.multiplierHundredths,
    },
  })

  revalidateOtmSurfaces()
  return { ok: true, ruleId: id }
}

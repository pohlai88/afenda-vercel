"use server"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { CreateOtmRateRuleFormState } from "../../../types"
import { createOtmRateRuleFormSchema } from "../schemas/otm.schema"
import { createOtmRateRule } from "../data/otm-rate-commands.server"

function parseMultiplierHundredths(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
}

export async function createOtmRateRuleAction(
  _prev: CreateOtmRateRuleFormState | undefined,
  formData: FormData
): Promise<CreateOtmRateRuleFormState> {
  const gate = await requireHrmPermission({
    object: "overtime",
    function: "update",
    errorMessage: "Overtime update permission required to create rate rules.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const { session } = gate
  const parsed = createOtmRateRuleFormSchema.safeParse({
    overtimeTypeId: formData.get("overtimeTypeId"),
    multiplier: formData.get("multiplier"),
    countryCode: formData.get("countryCode") || null,
    workerCategory: formData.get("workerCategory") || null,
    earningCode: formData.get("earningCode") || null,
    effectiveFrom: formData.get("effectiveFrom") || null,
    effectiveTo: formData.get("effectiveTo") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
      multiplier: errs.multiplier?.[0],
      overtimeTypeId: errs.overtimeTypeId?.[0],
    })
  }

  const multiplierHundredths = parseMultiplierHundredths(parsed.data.multiplier)
  if (multiplierHundredths === null) {
    return hrmActionFailure({ multiplier: "Enter a valid multiplier." })
  }

  const result = await createOtmRateRule({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    overtimeTypeId: parsed.data.overtimeTypeId,
    multiplierHundredths,
    countryCode: parsed.data.countryCode?.trim() || null,
    workerCategory: parsed.data.workerCategory?.trim() || null,
    earningCode: parsed.data.earningCode?.trim() || null,
    effectiveFrom: parsed.data.effectiveFrom?.trim() || null,
    effectiveTo: parsed.data.effectiveTo?.trim() || null,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.errors.form })
  }

  return { ok: true, ruleId: result.ruleId }
}

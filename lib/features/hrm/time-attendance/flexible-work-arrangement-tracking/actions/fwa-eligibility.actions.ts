"use server"

import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { CreateFwaEligibilityRuleFormState } from "../../../types"
import { createFwaEligibilityRule } from "../data/fwa-eligibility.server"
import { createFwaEligibilityRuleFormSchema } from "../schemas/fwa.schema"

export async function createFwaEligibilityRuleAction(
  _prev: CreateFwaEligibilityRuleFormState | undefined,
  formData: FormData
): Promise<CreateFwaEligibilityRuleFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: {
      module: "hrm",
      object: "flexible_work",
      function: "update",
    },
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to manage eligibility rules.",
    })
  }

  const parsed = createFwaEligibilityRuleFormSchema.safeParse({
    arrangementTypeId: formData.get("arrangementTypeId"),
    departmentId: formData.get("departmentId") || null,
    jobGradeId: formData.get("jobGradeId") || null,
    employmentType: formData.get("employmentType") || null,
    legalEntityCode: formData.get("legalEntityCode") || null,
    countryCode: formData.get("countryCode") || null,
    workLocationCode: formData.get("workLocationCode") || null,
    positionId: formData.get("positionId") || null,
    workerCategory: formData.get("workerCategory") || null,
    policyGroupCode: formData.get("policyGroupCode") || null,
    allowException: formData.get("allowException") === "on",
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
    })
  }

  const result = await createFwaEligibilityRule({
    organizationId,
    userId,
    sessionId,
    arrangementTypeId: parsed.data.arrangementTypeId,
    departmentId: parsed.data.departmentId ?? null,
    jobGradeId: parsed.data.jobGradeId ?? null,
    employmentType: parsed.data.employmentType?.trim() || null,
    legalEntityCode: parsed.data.legalEntityCode?.trim() || null,
    countryCode: parsed.data.countryCode?.trim() || null,
    workLocationCode: parsed.data.workLocationCode?.trim() || null,
    positionId: parsed.data.positionId ?? null,
    workerCategory: parsed.data.workerCategory?.trim() || null,
    policyGroupCode: parsed.data.policyGroupCode?.trim() || null,
    allowException: parsed.data.allowException ?? false,
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.form })
  }

  return { ok: true, ruleId: result.ruleId }
}

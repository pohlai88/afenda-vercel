"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_PAYROLL_PROCESSING_AUDIT } from "../payroll-processing.contract"
import { upsertPayrollGroupFormSchema } from "../schemas/payroll-group.schema"
import { upsertPayrollGroupMutation } from "../data/payroll.mutations.server"
import { requirePayrollSessionMutationGate } from "../data/payroll-action-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { PayrollGroupUpsertFormState } from "../payroll-form-states"

function revalidatePayrollPages() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/payroll"), "layout")
}

export async function upsertPayrollGroupAction(
  _prev: PayrollGroupUpsertFormState,
  formData: FormData
): Promise<PayrollGroupUpsertFormState> {
  const gate = await requirePayrollSessionMutationGate("update")
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = upsertPayrollGroupFormSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    paySchedule: formData.get("paySchedule"),
    payCurrency:
      formData.get("payCurrency") ?? formData.get("currency") ?? "MYR",
    isActive: formData.get("isActive") ?? "true",
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
    })
  }

  const { id } = await upsertPayrollGroupMutation({
    organizationId: gate.organizationId,
    code: parsed.data.code,
    name: parsed.data.name,
    countryCode: "MY",
    paySchedule: parsed.data.paySchedule,
    payCurrency: parsed.data.payCurrency,
    isActive: parsed.data.isActive,
    userId: gate.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_PAYROLL_PROCESSING_AUDIT.payGroup.upsert,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_payroll_group",
      resourceId: id,
      metadata: { code: parsed.data.code },
    })
  )

  revalidatePayrollPages()
  return { ok: true, groupId: id }
}

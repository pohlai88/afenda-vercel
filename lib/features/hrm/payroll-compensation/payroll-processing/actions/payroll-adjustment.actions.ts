"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_PAYROLL_PROCESSING_AUDIT } from "../payroll-processing.contract"
import { recordPayrollAdjustmentFormSchema } from "../schemas/payroll-adjustment.schema"
import { getPayrollPeriod } from "../data/payroll.queries.server"
import { insertPayrollAdjustment } from "../data/payroll.mutations.server"
import { requirePayrollSessionMutationGate } from "../data/payroll-action-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { PayrollAdjustmentFormState } from "../payroll-form-states"

function revalidatePayrollPages() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/payroll"),
    "layout"
  )
}

export async function recordPayrollAdjustmentAction(
  _prev: PayrollAdjustmentFormState,
  formData: FormData
): Promise<PayrollAdjustmentFormState> {
  const gate = await requirePayrollSessionMutationGate("update")
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = recordPayrollAdjustmentFormSchema.safeParse({
    periodId: formData.get("periodId"),
    employeeId: formData.get("employeeId"),
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    currency: formData.get("currency") ?? "MYR",
    reason: formData.get("reason"),
    approvalId: formData.get("approvalId") || undefined,
    retroReferencePeriodId: formData.get("retroReferencePeriodId") || undefined,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.periodId?.[0] ?? fe.employeeId?.[0] ?? fe.amount?.[0],
    })
  }

  const period = await getPayrollPeriod(
    gate.organizationId,
    parsed.data.periodId
  )
  if (!period) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (period.state !== "open" && period.state !== "preparing") {
    return hrmActionFailure({
      form: "Adjustments can only be recorded while the period is open or preparing.",
    })
  }

  const { id } = await insertPayrollAdjustment({
    organizationId: gate.organizationId,
    periodId: parsed.data.periodId,
    employeeId: parsed.data.employeeId,
    kind: parsed.data.kind,
    amount: parsed.data.amount,
    currency: parsed.data.currency ?? period.currency,
    reason: parsed.data.reason,
    approvalId: parsed.data.approvalId ?? null,
    retroReferencePeriodId: parsed.data.retroReferencePeriodId ?? null,
    createdByUserId: gate.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_PAYROLL_PROCESSING_AUDIT.adjustment.create,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_payroll_adjustment",
      resourceId: id,
      metadata: {
        periodId: parsed.data.periodId,
        employeeId: parsed.data.employeeId,
        kind: parsed.data.kind,
      },
    })
  )

  revalidatePayrollPages()
  return { ok: true, adjustmentId: id }
}

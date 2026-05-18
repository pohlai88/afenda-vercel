"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_PAYROLL_PROCESSING_AUDIT } from "../payroll-processing.contract"
import {
  generatePayrollPaymentBatchFormSchema,
  updatePayrollPaymentStatusFormSchema,
} from "../schemas/payroll-payment.schema"
import { generatePayrollPaymentBatch } from "../data/payroll-payment-batch.server"
import { updatePayrollPaymentStatus } from "../data/payroll.mutations.server"
import { requirePayrollSessionMutationGate } from "../data/payroll-action-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  PayrollPaymentBatchFormState,
  PayrollPaymentStatusFormState,
} from "../payroll-form-states"

function revalidatePayrollPages() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/payroll"),
    "layout"
  )
}

export async function generatePayrollPaymentBatchAction(
  _prev: PayrollPaymentBatchFormState,
  formData: FormData
): Promise<PayrollPaymentBatchFormState> {
  const gate = await requirePayrollSessionMutationGate("update")
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = generatePayrollPaymentBatchFormSchema.safeParse({
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      periodId: parsed.error.flatten().fieldErrors.periodId?.[0],
    })
  }

  let result
  try {
    result = await generatePayrollPaymentBatch({
      organizationId: gate.organizationId,
      periodId: parsed.data.periodId,
      actorUserId: gate.userId,
    })
  } catch (error) {
    return hrmActionFailure({
      form: error instanceof Error ? error.message : "Payment batch failed.",
    })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_PAYROLL_PROCESSING_AUDIT.paymentBatch.generate,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_payroll_payment_batch",
      resourceId: result.batchId,
      metadata: {
        periodId: parsed.data.periodId,
        reference: result.reference,
        paymentCount: result.paymentCount,
      },
    })
  )

  revalidatePayrollPages()
  return {
    ok: true,
    batchId: result.batchId,
    reference: result.reference,
    paymentCount: result.paymentCount,
  }
}

export async function updatePayrollPaymentStatusAction(
  _prev: PayrollPaymentStatusFormState,
  formData: FormData
): Promise<PayrollPaymentStatusFormState> {
  const gate = await requirePayrollSessionMutationGate("update")
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = updatePayrollPaymentStatusFormSchema.safeParse({
    paymentId: formData.get("paymentId"),
    status: formData.get("status"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      paymentId: fe.paymentId?.[0],
      status: fe.status?.[0],
    })
  }

  await updatePayrollPaymentStatus({
    organizationId: gate.organizationId,
    paymentId: parsed.data.paymentId,
    status: parsed.data.status,
    paidAt: parsed.data.status === "paid" ? new Date() : null,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_PAYROLL_PROCESSING_AUDIT.paymentBatch.statusUpdate,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_payroll_payment",
      resourceId: parsed.data.paymentId,
      metadata: { status: parsed.data.status },
    })
  )

  revalidatePayrollPages()
  return { ok: true }
}

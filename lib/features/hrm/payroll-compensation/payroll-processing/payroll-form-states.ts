export type PayrollAdjustmentFormState =
  | { ok: true; adjustmentId: string }
  | {
      ok: false
      errors: {
        form?: string
        periodId?: string
        employeeId?: string
        amount?: string
      }
    }

export type PayrollPaymentBatchFormState =
  | {
      ok: true
      batchId: string
      reference: string
      paymentCount: number
    }
  | { ok: false; errors: { form?: string; periodId?: string } }

export type PayrollPaymentStatusFormState =
  | { ok: true }
  | {
      ok: false
      errors: { form?: string; paymentId?: string; status?: string }
    }

export type PayrollGroupUpsertFormState =
  | { ok: true; groupId: string }
  | {
      ok: false
      errors: { form?: string; code?: string; name?: string }
    }

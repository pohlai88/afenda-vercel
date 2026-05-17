import "server-only"

import { put } from "@vercel/blob"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDocument, hrmPayrollProfile } from "#lib/db/schema"

import {
  getPayrollPeriod,
  listPayrollRunsForPeriod,
} from "./payroll.queries.server"
import {
  insertPayrollPaymentBatch,
  insertPayrollPaymentRow,
} from "./payroll.mutations.server"
import { isPayrollPeriodLocked } from "./payroll-cycle-status.shared"

export type PayrollPaymentBatchResult = {
  readonly batchId: string
  readonly reference: string
  readonly paymentCount: number
  readonly documentId: string | null
  readonly blobUrl: string | null
}

export async function generatePayrollPaymentBatch(input: {
  readonly organizationId: string
  readonly periodId: string
  readonly actorUserId: string
}): Promise<PayrollPaymentBatchResult> {
  const period = await getPayrollPeriod(input.organizationId, input.periodId)
  if (!period) {
    throw new Error("Payroll period not found.")
  }
  if (!isPayrollPeriodLocked(period.state)) {
    throw new Error("Payment batch requires a locked or finalized payroll period.")
  }

  const runs = await listPayrollRunsForPeriod(
    input.organizationId,
    input.periodId
  )
  const lockedRuns = runs.filter((r) => r.state === "locked")
  if (lockedRuns.length === 0) {
    throw new Error("No locked payroll runs to include in the payment batch.")
  }

  const reference = `PAY-${period.periodEnd.replace(/-/g, "")}-${crypto.randomUUID().slice(0, 8)}`
  const { id: batchId } = await insertPayrollPaymentBatch({
    organizationId: input.organizationId,
    periodId: input.periodId,
    reference,
    createdByUserId: input.actorUserId,
  })

  const paymentRows: Array<{
    employeeId: string
    employeeNumber: string
    netAmount: string
    currency: string
    bankCode: string | null
    bankAccountTokenized: string | null
  }> = []

  for (const run of lockedRuns) {
    let bankCode: string | null = null
    let bankAccountTokenized: string | null = null
    if (run.profileId) {
      const profile = await db
        .select({
          bankCode: hrmPayrollProfile.bankCode,
          bankAccountTokenized: hrmPayrollProfile.bankAccountTokenized,
        })
        .from(hrmPayrollProfile)
        .where(
          and(
            eq(hrmPayrollProfile.organizationId, input.organizationId),
            eq(hrmPayrollProfile.id, run.profileId)
          )
        )
        .limit(1)
      bankCode = profile[0]?.bankCode ?? null
      bankAccountTokenized = profile[0]?.bankAccountTokenized ?? null
    }

    await insertPayrollPaymentRow({
      organizationId: input.organizationId,
      batchId,
      employeeId: run.employeeId,
      netAmount: run.netPay,
      currency: period.currency,
    })

    paymentRows.push({
      employeeId: run.employeeId,
      employeeNumber: run.employeeNumber,
      netAmount: run.netPay,
      currency: period.currency,
      bankCode,
      bankAccountTokenized,
    })
  }

  const payload = JSON.stringify(
    {
      batchId,
      reference,
      periodId: input.periodId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      paymentDate: period.paymentDate,
      currency: period.currency,
      generatedAt: new Date().toISOString(),
      payments: paymentRows,
    },
    null,
    2
  )

  const blobPath = [
    "orgs",
    input.organizationId,
    "hrm",
    "payroll",
    "payment-batches",
    input.periodId,
    `${batchId}.json`,
  ].join("/")

  const blob = await put(blobPath, payload, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  })

  const inserted = await db
    .insert(hrmDocument)
    .values({
      organizationId: input.organizationId,
      documentType: "payroll_payment_batch",
      subjectKind: "payroll_payment_batch",
      subjectId: batchId,
      title: `Payment batch ${reference}`,
      blobUrl: blob.url,
      payloadHash: reference,
      mimeType: "application/json",
      sizeBytes: new TextEncoder().encode(payload).byteLength,
      classification: "confidential",
      retentionPolicyCode: "payroll_payment_batch",
      effectiveFrom: new Date(`${period.periodEnd}T00:00:00.000Z`),
      uploadedByUserId: input.actorUserId,
    })
    .returning({ id: hrmDocument.id })

  return {
    batchId,
    reference,
    paymentCount: paymentRows.length,
    documentId: inserted[0]?.id ?? null,
    blobUrl: blob.url,
  }
}

"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  buildPayrollCloseSnapshot,
  buildPayslipSnapshotForRun,
  persistPayrollPayslipSnapshots,
} from "../data/payroll-close.server"
import { postPayrollPeriod } from "../data/payroll-posting.server"
import { listPayrollRunsForPeriod } from "../data/payroll.queries.server"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"

import type {
  PayrollCloseActionFormState,
  PayrollPayslipSnapshot,
} from "../data/payroll-close.shared"

const payrollClosePeriodActionSchema = z.object({
  periodId: z.string().uuid("Invalid period ID"),
})

function revalidatePayrollPages() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/payroll"),
    "layout"
  )
}

async function requirePayrollUpdate() {
  return requireHrmPermission({
    object: "payroll",
    function: "update",
  })
}

function invalidPeriodFailure(
  formData: FormData
):
  | { ok: true; periodId: string }
  | Extract<PayrollCloseActionFormState, { ok: false }> {
  const parsed = payrollClosePeriodActionSchema.safeParse({
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      periodId: parsed.error.flatten().fieldErrors.periodId?.[0],
    })
  }
  return { ok: true, periodId: parsed.data.periodId }
}

function payrollPayslipSnapshotErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("locked")) {
    return error.message
  }
  return "Could not build payslip snapshots for locked payroll runs."
}

function payrollPayslipPersistenceErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Could not persist payslip snapshots to governed document storage."
  }

  if (error.message === "payslip_snapshot_hash_mismatch") {
    return "A different payslip snapshot already exists for this locked run. Stop and investigate payroll immutability before publishing."
  }
  if (error.message === "payslip_snapshot_hash_invalid") {
    return "Payslip snapshot hash validation failed before persistence."
  }
  if (error.message === "payslip_snapshot_document_insert_failed") {
    return "Payslip snapshot was written to storage but could not be registered in the HR document vault."
  }

  return "Could not persist payslip snapshots to governed document storage."
}

function payrollPostingErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Could not post payroll to the governed journal."
  }

  if (error.name === "payroll_posting_source_hash_mismatch") {
    return "A different payroll posting already exists for this period. Stop and investigate posting drift before retrying."
  }
  if (error.name === "payroll_posting_persisted_mismatch") {
    return "Persisted payroll posting does not match the computed posting payload."
  }

  return error.message || "Could not post payroll to the governed journal."
}

export async function refreshPayrollCloseSnapshotAction(
  _prev: PayrollCloseActionFormState,
  formData: FormData
): Promise<PayrollCloseActionFormState> {
  const gate = await requireHrmPermission({
    object: "payroll",
    function: "read",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = invalidPeriodFailure(formData)
  if (!parsed.ok) return parsed

  const snapshot = await buildPayrollCloseSnapshot({
    organizationId: gate.session.organizationId,
    periodId: parsed.periodId,
  })
  if (!snapshot) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }

  revalidatePayrollPages()
  return {
    ok: true,
    message: "Close passport refreshed.",
    snapshotHash: snapshot.inputHash,
  }
}

export async function postPayrollPeriodAction(
  _prev: PayrollCloseActionFormState,
  formData: FormData
): Promise<PayrollCloseActionFormState> {
  const gate = await requirePayrollUpdate()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = invalidPeriodFailure(formData)
  if (!parsed.ok) return parsed

  const result = await postPayrollPeriod({
    organizationId: gate.session.organizationId,
    periodId: parsed.periodId,
    actorUserId: gate.session.userId,
  }).catch((error: unknown) => ({ error }))
  if ("error" in result) {
    return hrmActionFailure({
      form: payrollPostingErrorMessage(result.error),
    })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "payroll_posting",
        verb: result.outcome === "posted" ? "create" : "audit",
      }),
      actorUserId: gate.session.userId,
      actorSessionId: gate.session.sessionId,
      organizationId: gate.session.organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: parsed.periodId,
      metadata: {
        periodId: parsed.periodId,
        journalId: result.record.journalId,
        journalReference: result.record.reference,
        closeSnapshotHash: result.record.closeSnapshotHash,
        postingPreviewHash: result.record.sourceHash,
        totalDebits: result.record.totalDebits,
        totalCredits: result.record.totalCredits,
        outcome: result.outcome,
      },
    })
  )

  revalidatePayrollPages()
  return {
    ok: true,
    message:
      result.outcome === "posted"
        ? `Payroll posted to governed journal ${result.record.reference}.`
        : `Payroll was already posted to governed journal ${result.record.reference}.`,
    snapshotHash: result.record.closeSnapshotHash,
    postingPreviewHash: result.record.sourceHash,
  }
}

export async function generatePayrollPayslipsAction(
  _prev: PayrollCloseActionFormState,
  formData: FormData
): Promise<PayrollCloseActionFormState> {
  const gate = await requirePayrollUpdate()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = invalidPeriodFailure(formData)
  if (!parsed.ok) return parsed

  const snapshot = await buildPayrollCloseSnapshot({
    organizationId: gate.session.organizationId,
    periodId: parsed.periodId,
  })
  if (!snapshot) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (
    snapshot.periodState !== "locked" &&
    snapshot.periodState !== "finalized" &&
    snapshot.periodState !== "posted"
  ) {
    return hrmActionFailure({
      form: "Payslip snapshots can only be generated after payroll lock.",
    })
  }

  const runs = await listPayrollRunsForPeriod(
    gate.session.organizationId,
    parsed.periodId
  )

  let payslips: PayrollPayslipSnapshot[]
  try {
    const snapshots = await Promise.all(
      runs.map((run) =>
        buildPayslipSnapshotForRun({
          organizationId: gate.session.organizationId,
          runId: run.id,
        })
      )
    )
    payslips = snapshots.filter(
      (candidate): candidate is PayrollPayslipSnapshot => candidate !== null
    )
  } catch (error) {
    return hrmActionFailure({
      form: payrollPayslipSnapshotErrorMessage(error),
    })
  }

  if (payslips.length !== runs.length) {
    return hrmActionFailure({
      form: "One or more locked payroll runs could not produce a payslip snapshot.",
    })
  }

  const persisted = await persistPayrollPayslipSnapshots({
    organizationId: gate.session.organizationId,
    actorUserId: gate.session.userId,
    snapshots: payslips,
  }).catch((error: unknown) => ({
    error,
  }))
  if ("error" in persisted) {
    return hrmActionFailure({
      form: payrollPayslipPersistenceErrorMessage(persisted.error),
    })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "payroll_payslip_snapshot",
        verb: "audit",
      }),
      actorUserId: gate.session.userId,
      actorSessionId: gate.session.sessionId,
      organizationId: gate.session.organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: parsed.periodId,
      metadata: {
        periodId: parsed.periodId,
        closeSnapshotHash: snapshot.inputHash,
        payslipCount: payslips.length,
        createdDocumentCount: persisted.createdCount,
        existingDocumentCount: persisted.existingCount,
        documentIds: persisted.documentIds,
      },
    })
  )

  revalidatePayrollPages()
  return {
    ok: true,
    message:
      persisted.createdCount > 0
        ? "Payslip snapshots persisted to governed document storage."
        : "Payslip snapshots already exist in governed document storage.",
    snapshotHash: snapshot.inputHash,
    payslipCount: payslips.length,
    createdDocumentCount: persisted.createdCount,
    existingDocumentCount: persisted.existingCount,
  }
}

export async function publishPayrollPayslipsAction(
  _prev: PayrollCloseActionFormState,
  formData: FormData
): Promise<PayrollCloseActionFormState> {
  const gate = await requirePayrollUpdate()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = invalidPeriodFailure(formData)
  if (!parsed.ok) return parsed

  const snapshot = await buildPayrollCloseSnapshot({
    organizationId: gate.session.organizationId,
    periodId: parsed.periodId,
  })
  if (!snapshot) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (
    snapshot.periodState !== "locked" &&
    snapshot.periodState !== "finalized" &&
    snapshot.periodState !== "posted"
  ) {
    return hrmActionFailure({
      form: "Payslips can only be published after payroll lock.",
    })
  }

  return hrmActionFailure({
    form: "Payslip publishing requires the employee document delivery channel to be enabled.",
  })
}

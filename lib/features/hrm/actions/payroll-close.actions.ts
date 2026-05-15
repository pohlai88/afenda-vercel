"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  buildPayrollCloseSnapshot,
  buildPayslipSnapshotForRun,
  persistPayrollPayslipSnapshots,
} from "../data/payroll-close.server"
import { listPayrollRunsForPeriod } from "../data/payroll.queries.server"
import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"

import type {
  PayrollCloseActionFormState,
  PayrollPayslipSnapshot,
} from "../data/payroll-close.shared"

const payrollClosePeriodActionSchema = z.object({
  periodId: z.string().uuid("Invalid period ID"),
})

function revalidatePayrollPages() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/payroll"),
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

  const snapshot = await buildPayrollCloseSnapshot({
    organizationId: gate.session.organizationId,
    periodId: parsed.periodId,
  })
  if (!snapshot) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (
    snapshot.periodState !== "locked" &&
    snapshot.periodState !== "finalized"
  ) {
    return hrmActionFailure({
      form: "Payroll must be locked before posting can be validated.",
    })
  }
  if (!snapshot.postingPreview.isBalanced) {
    return hrmActionFailure({
      form: `Posting preview is not balanced (${snapshot.postingPreview.netBalance}).`,
    })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "payroll_posting_preview",
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
        postingPreviewHash: snapshot.postingPreview.inputHash,
        totalDebits: snapshot.postingPreview.totalDebits,
        totalCredits: snapshot.postingPreview.totalCredits,
      },
    })
  )

  revalidatePayrollPages()
  return {
    ok: true,
    message:
      "Posting preview is balanced. Accounting journal posting remains behind the payroll posting integration point.",
    snapshotHash: snapshot.inputHash,
    postingPreviewHash: snapshot.postingPreview.inputHash,
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
    snapshot.periodState !== "finalized"
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
    snapshot.periodState !== "finalized"
  ) {
    return hrmActionFailure({
      form: "Payslips can only be published after payroll lock.",
    })
  }

  return hrmActionFailure({
    form: "Payslip publishing requires the employee document delivery channel to be enabled.",
  })
}

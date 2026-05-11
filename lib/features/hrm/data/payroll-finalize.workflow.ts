import { revalidatePath } from "next/cache"
import { FatalError } from "workflow"

import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"
import { writeIamAuditEvent } from "#lib/auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { computePayrollRun } from "./payroll-engine.server"
import {
  getPayrollPeriod,
  listPayrollRunsForPeriod,
  getPayrollRunInputSnapshot,
} from "./payroll.queries.server"
import {
  updatePayrollRun,
  insertPayrollLines,
  deletePayrollLinesForRun,
} from "./payroll.mutations.server"
import { resolveRulePack } from "./payroll-rule-pack.server"

export type PayrollFinalizePayload = {
  readonly organizationId: string
  readonly periodId: string
  readonly actorUserId: string
  readonly actorSessionId: string | null
}

// ---------------------------------------------------------------------------
// Durable payroll finalization workflow (compute runs; lock is separate UI)
// ---------------------------------------------------------------------------

/**
 * Durable payroll preparation workflow.
 *
 * Computes lines for each active employee run after prepare staging.
 * Period lock pins rule-pack version and freezes attendance via Server Action,
 * not inside this workflow.
 *
 * Orchestrator only — tenant and role gates live in `preparePayrollRunsAction`.
 */
export async function payrollFinalizeWorkflow(payload: PayrollFinalizePayload) {
  "use workflow"

  try {
    await payrollPrepareStartedStep(payload)

    for (;;) {
      const { done } = await computeNextPayrollRunStep(payload)
      if (done) break
    }

    await payrollPrepareCompletedStep(payload)
  } catch (err) {
    await payrollPrepareFailedStep(payload, err)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function payrollPrepareStartedStep(payload: PayrollFinalizePayload) {
  "use step"

  await writeIamAuditEvent({
    action: "erp.hrm.payroll_run.preview",
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "hrm_payroll_period",
    resourceId: payload.periodId,
    metadata: { periodId: payload.periodId, phase: "started" },
  })
}

async function computeNextPayrollRunStep(
  payload: PayrollFinalizePayload
): Promise<{ done: boolean }> {
  "use step"

  const period = await getPayrollPeriod(
    payload.organizationId,
    payload.periodId
  )
  if (!period) {
    throw new FatalError("Payroll period not found during workflow step.")
  }
  if (period.state !== "preparing") {
    return { done: true }
  }

  // Find the next run that hasn't been computed yet
  const runs = await listPayrollRunsForPeriod(
    payload.organizationId,
    payload.periodId
  )
  const pending = runs.find((r) => r.state === "draft")
  if (!pending) {
    return { done: true }
  }

  // Resolve the rule pack (may be null if RULE_PACK_REGISTRY is empty)
  const snapshot = await getPayrollRunInputSnapshot(
    payload.organizationId,
    pending.id
  )

  let pack = null
  try {
    const periodEnd = new Date(`${period.periodEnd}T00:00:00.000Z`)
    if (snapshot?.countryCode) {
      pack = resolveRulePack(snapshot.countryCode, periodEnd)
    }
  } catch {
    // No pack registered for country/date — proceed without statutory lines
  }
  if (!snapshot) {
    await updatePayrollRun(payload.organizationId, pending.id, {
      state: "computed",
      validationIssues: [
        { code: "MISSING_SNAPSHOT", message: "No input snapshot available." },
      ],
      computedByUserId: payload.actorUserId,
    })
    return { done: false }
  }

  const result = await computePayrollRun(snapshot, pack)

  // Replace lines atomically
  await deletePayrollLinesForRun(payload.organizationId, pending.id)
  if (result.lines.length > 0) {
    await insertPayrollLines(payload.organizationId, pending.id, result.lines)
  }

  await updatePayrollRun(payload.organizationId, pending.id, {
    state: "computed",
    grossPay: result.grossPay,
    netPay: result.netPay,
    employerCost: result.employerCost,
    validationIssues: result.validationIssues,
    inputDigest: result.inputDigest,
    computedByUserId: payload.actorUserId,
  })

  return { done: false }
}

async function payrollPrepareCompletedStep(payload: PayrollFinalizePayload) {
  "use step"

  // Period stays `preparing` until an admin locks via `lockPayrollPeriodAction`.

  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/payroll"), "page")

  await writeIamAuditEvent({
    action: "erp.hrm.payroll_run.preview",
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "hrm_payroll_period",
    resourceId: payload.periodId,
    metadata: { periodId: payload.periodId, phase: "completed" },
  })
}

async function payrollPrepareFailedStep(
  payload: PayrollFinalizePayload,
  err: unknown
) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.PAYROLL_FINALIZE_RUN_FAILED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "hrm_payroll_period",
    resourceId: payload.periodId,
    metadata: {
      periodId: payload.periodId,
      error: err instanceof Error ? err.message : String(err),
    },
  })
}

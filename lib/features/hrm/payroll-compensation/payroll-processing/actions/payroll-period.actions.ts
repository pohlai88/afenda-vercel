"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import {
  enqueuePayrollFinalizeWorkflowRun,
  payrollFinalizePayloadSchema,
} from "#features/execution"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  createPayrollPeriodFormSchema,
  updatePayrollPeriodFormSchema,
  preparePayrollRunsFormSchema,
  lockPayrollPeriodFormSchema,
} from "../schemas/payroll-period.schema"
import {
  createPayrollPeriodMutation,
  updatePayrollPeriodMutation,
  updatePayrollPeriodState,
  insertPayrollRun,
  lockPayrollPeriodAndRunsMutation,
} from "../data/payroll.mutations.server"
import {
  getPayrollPeriod,
  listPayrollRunsForPeriod,
  isAttendancePayrollReadyForPeriod,
  getApprovedPayrollPeriodLockApproval,
  getPayrollPeriodPrimaryCountryCode,
} from "../data/payroll.queries.server"
import { requirePayrollSessionMutationGate } from "../data/payroll-action-guard.server"
import {
  buildCompensationSnapshotForContract,
  ensureDefaultHrmCompensationComponents,
} from "../../compensation-planning-modeling/server"
import { resolveRulePack } from "../../multi-country-payroll/data/payroll-rule-pack.server"
import { HRM_PAYROLL_PROCESSING_AUDIT } from "../payroll-processing.contract"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  PayrollPeriodCreateFormState,
  PayrollPeriodUpdateFormState,
  PreparePayrollRunsFormState,
  LockPayrollPeriodFormState,
} from "../../../types"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmPayrollProfile,
  hrmEmploymentContract,
} from "#lib/db/schema"
import { and, eq, isNull } from "drizzle-orm"

// ---------------------------------------------------------------------------
// revalidation helper
// ---------------------------------------------------------------------------

/**
 * Revalidates at **layout** scope so the HRM rail's `payroll` pressure
 * badge (Phase 2 — `getHrmRailPressureCounts`) refreshes after every
 * payroll-period mutation. Locking a period enqueues
 * `payroll_period_lock` approvals; that state change is exactly what
 * the badge surfaces. The payroll page revalidation comes along for
 * free since it sits below the layout.
 */
function revalidatePayrollPages() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/payroll"),
    "layout"
  )
}

// ---------------------------------------------------------------------------
// Create payroll period
// ---------------------------------------------------------------------------

export async function createPayrollPeriodAction(
  _prev: PayrollPeriodCreateFormState,
  formData: FormData
): Promise<PayrollPeriodCreateFormState> {
  const gate = await requirePayrollSessionMutationGate("create")
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = createPayrollPeriodFormSchema.safeParse({
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    cutoffDate: formData.get("cutoffDate"),
    paymentDate: formData.get("paymentDate"),
    payrollGroupCode: formData.get("payrollGroupCode"),
    currency: formData.get("currency") ?? "MYR",
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      periodStart: fe.periodStart?.[0],
      periodEnd: fe.periodEnd?.[0],
      cutoffDate: fe.cutoffDate?.[0],
      paymentDate: fe.paymentDate?.[0],
      payrollGroupCode: fe.payrollGroupCode?.[0],
      currency: fe.currency?.[0],
    })
  }

  const { organizationId, userId } = gate
  let periodId: string
  try {
    const result = await createPayrollPeriodMutation({
      organizationId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      cutoffDate: parsed.data.cutoffDate,
      paymentDate: parsed.data.paymentDate,
      payrollGroupCode: parsed.data.payrollGroupCode,
      currency: parsed.data.currency,
      createdByUserId: userId,
    })
    periodId = result.id
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("unique")
        ? "A payroll period with these dates already exists."
        : "Failed to create payroll period."
    return hrmActionFailure({ form: message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_PAYROLL_PROCESSING_AUDIT.period.create,
      actorUserId: userId,
      organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: periodId,
      metadata: {
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        cutoffDate: parsed.data.cutoffDate,
        payrollGroupCode: parsed.data.payrollGroupCode,
        currency: parsed.data.currency,
      },
    })
  )

  revalidatePayrollPages()
  return { ok: true, periodId }
}

// ---------------------------------------------------------------------------
// Update payroll period (open only)
// ---------------------------------------------------------------------------

export async function updatePayrollPeriodAction(
  _prev: PayrollPeriodUpdateFormState,
  formData: FormData
): Promise<PayrollPeriodUpdateFormState> {
  const gate = await requirePayrollSessionMutationGate("update")
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = updatePayrollPeriodFormSchema.safeParse({
    periodId: formData.get("periodId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    cutoffDate: formData.get("cutoffDate"),
    paymentDate: formData.get("paymentDate"),
    payrollGroupCode: formData.get("payrollGroupCode"),
    currency: formData.get("currency"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      periodStart: fe.periodStart?.[0],
      periodEnd: fe.periodEnd?.[0],
      cutoffDate: fe.cutoffDate?.[0],
      paymentDate: fe.paymentDate?.[0],
      payrollGroupCode: fe.payrollGroupCode?.[0],
      currency: fe.currency?.[0],
    })
  }

  const { organizationId, userId } = gate
  const period = await getPayrollPeriod(organizationId, parsed.data.periodId)
  if (!period) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (period.state !== "open") {
    return hrmActionFailure({ form: "Only open periods can be edited." })
  }

  await updatePayrollPeriodMutation(organizationId, parsed.data.periodId, {
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    cutoffDate: parsed.data.cutoffDate,
    paymentDate: parsed.data.paymentDate,
    payrollGroupCode: parsed.data.payrollGroupCode,
    currency: parsed.data.currency,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_PAYROLL_PROCESSING_AUDIT.period.amend,
      actorUserId: userId,
      organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: parsed.data.periodId,
      metadata: {
        periodId: parsed.data.periodId,
        cutoffDate: parsed.data.cutoffDate,
        payrollGroupCode: parsed.data.payrollGroupCode,
      },
    })
  )

  revalidatePayrollPages()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Prepare payroll runs (durable workflow preview compute — Phase 3B)
// ---------------------------------------------------------------------------

/**
 * Transitions a period from `open` → `preparing`, creates draft run rows
 * for all active employees with a payroll profile, and enqueues durable computation.
 */
export async function preparePayrollRunsAction(
  _prev: PreparePayrollRunsFormState,
  formData: FormData
): Promise<PreparePayrollRunsFormState> {
  const gate = await requirePayrollSessionMutationGate("update")
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = preparePayrollRunsFormSchema.safeParse({
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      periodId: parsed.error.flatten().fieldErrors.periodId?.[0],
    })
  }

  const { organizationId, userId, sessionId } = gate
  const period = await getPayrollPeriod(organizationId, parsed.data.periodId)
  if (!period) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (period.state !== "open") {
    return hrmActionFailure({
      form: "Period must be in open state to start preparation.",
    })
  }
  if (!period.payrollGroupCode) {
    return hrmActionFailure({
      form: "Assign a payroll group to the period before preparing runs.",
    })
  }

  await updatePayrollPeriodState(
    organizationId,
    parsed.data.periodId,
    "preparing"
  )
  await ensureDefaultHrmCompensationComponents(organizationId)

  const employees = await db
    .selectDistinct({ employeeId: hrmEmployee.id })
    .from(hrmEmployee)
    .innerJoin(
      hrmPayrollProfile,
      and(
        eq(hrmPayrollProfile.organizationId, organizationId),
        eq(hrmPayrollProfile.employeeId, hrmEmployee.id),
        eq(hrmPayrollProfile.payrollGroupCode, period.payrollGroupCode)
      )
    )
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )

  const runCount = employees.length
  for (const { employeeId } of employees) {
    const profile = await db.query.hrmPayrollProfile.findFirst({
      where: and(
        eq(hrmPayrollProfile.organizationId, organizationId),
        eq(hrmPayrollProfile.employeeId, employeeId),
        isNull(hrmPayrollProfile.effectiveTo)
      ),
      orderBy: (t, { desc }) => [desc(t.effectiveFrom)],
    })
    const contract = await db.query.hrmEmploymentContract.findFirst({
      where: and(
        eq(hrmEmploymentContract.organizationId, organizationId),
        eq(hrmEmploymentContract.employeeId, employeeId),
        eq(hrmEmploymentContract.state, "active")
      ),
    })
    const compensationSnapshot = contract
      ? await buildCompensationSnapshotForContract(organizationId, contract.id)
      : []

    await insertPayrollRun(organizationId, parsed.data.periodId, employeeId, {
      contractId: contract?.id ?? null,
      profileId: profile?.id ?? null,
      compensationSnapshot,
      createdByUserId: userId,
    })
  }

  await enqueuePayrollFinalizeWorkflowRun(
    payrollFinalizePayloadSchema.parse({
      organizationId,
      periodId: parsed.data.periodId,
      actorUserId: userId,
      actorSessionId: sessionId,
    })
  )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_PAYROLL_PROCESSING_AUDIT.period.prepare,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: parsed.data.periodId,
      metadata: {
        periodId: parsed.data.periodId,
        runCount,
      },
    })
  )

  revalidatePayrollPages()
  return { ok: true, periodId: parsed.data.periodId, runCount }
}

// ---------------------------------------------------------------------------
// Lock payroll period (country rule pack + maker-checker certification)
// ---------------------------------------------------------------------------

export async function lockPayrollPeriodAction(
  _prev: LockPayrollPeriodFormState,
  formData: FormData
): Promise<LockPayrollPeriodFormState> {
  const gate = await requirePayrollSessionMutationGate("update")
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = lockPayrollPeriodFormSchema.safeParse({
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      periodId: parsed.error.flatten().fieldErrors.periodId?.[0],
    })
  }

  const { organizationId, userId, sessionId } = gate
  const period = await getPayrollPeriod(organizationId, parsed.data.periodId)
  if (!period) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (period.state !== "preparing") {
    return hrmActionFailure({ form: "Period must be preparing to lock." })
  }
  const runs = await listPayrollRunsForPeriod(
    organizationId,
    parsed.data.periodId
  )
  if (runs.length === 0) {
    return hrmActionFailure({
      form: "No payroll runs — prepare the period first.",
    })
  }
  if (!runs.every((r) => r.state === "computed")) {
    return hrmActionFailure({
      form: "All runs must finish computing before lock.",
    })
  }
  if (!runs.every((r) => r.validationIssues.length === 0)) {
    return hrmActionFailure({
      form: "Resolve validation issues on every run before locking.",
    })
  }

  const attendanceOk = await isAttendancePayrollReadyForPeriod({
    organizationId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  })
  if (!attendanceOk) {
    return hrmActionFailure({
      form: "Attendance days in this window must be computed, locked, and free of payroll-blocking exceptions before payroll lock.",
    })
  }

  const approvedLock = await getApprovedPayrollPeriodLockApproval(
    organizationId,
    parsed.data.periodId
  )
  if (!approvedLock) {
    return hrmActionFailure({
      form: "Request and obtain approved lock certification before locking.",
    })
  }
  if (
    !approvedLock.decisionByUserId ||
    approvedLock.decisionByUserId === approvedLock.requestedByUserId
  ) {
    return hrmActionFailure({
      form: "Payroll lock certification must be approved by a different user.",
    })
  }

  let rulePackVersion: string
  const primaryCountryCode = await getPayrollPeriodPrimaryCountryCode(
    organizationId,
    parsed.data.periodId
  )
  try {
    const periodEnd = new Date(`${period.periodEnd}T00:00:00.000Z`)
    rulePackVersion = resolveRulePack(primaryCountryCode, periodEnd).version
  } catch {
    return hrmActionFailure({
      form: `No ${primaryCountryCode} rule pack is registered for this period end date.`,
    })
  }

  const lockResult = await lockPayrollPeriodAndRunsMutation({
    organizationId,
    periodId: parsed.data.periodId,
    rulePackVersion,
    lockedByUserId: userId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_PAYROLL_PROCESSING_AUDIT.period.lock,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: parsed.data.periodId,
      metadata: {
        periodId: parsed.data.periodId,
        approvalId: approvedLock.id,
        primaryCountryCode,
        rulePackVersion,
        paidClaimCount: lockResult.paidClaims.length,
      },
    })
  )

  // Phase 4 — one `erp.hrm.claim.paid` audit per claim that this lock
  // settled. Written via `after` so the response is not blocked by a
  // potentially long audit fan-out, and emitted in a stable order so
  // downstream readers see deterministic causality.
  for (const entry of lockResult.paidClaims) {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: "erp.hrm.claim.paid",
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_claim",
        resourceId: entry.claimId,
        metadata: {
          claimId: entry.claimId,
          payrollPeriodId: parsed.data.periodId,
          payrollLineId: entry.payrollLineId,
        },
      })
    )
  }

  revalidatePayrollPages()
  // Refresh the claims surface so kanban / inbox / recents reflect the
  // newly-paid claims. Use the dashboard pattern so all locales rebuild.
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/claims"), "layout")
  return { ok: true }
}

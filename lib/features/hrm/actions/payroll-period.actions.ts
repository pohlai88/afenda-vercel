"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import {
  enqueuePayrollFinalizeWorkflowRun,
  payrollFinalizePayloadSchema,
} from "#features/execution"
import { requireErpPermission } from "#features/erp-rbac/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
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
  hasApprovedPayrollPeriodLockApproval,
} from "../data/payroll.queries.server"
import { resolveRulePack } from "../data/payroll-rule-pack.server"
import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type {
  PayrollPeriodCreateFormState,
  PayrollPeriodUpdateFormState,
  PreparePayrollRunsFormState,
  LockPayrollPeriodFormState,
} from "../types"
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
  const gate = await requireErpPermission({
    module: "hrm",
    object: "payroll",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const session = gate.session

  const parsed = createPayrollPeriodFormSchema.safeParse({
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    paymentDate: formData.get("paymentDate"),
    currency: formData.get("currency") ?? "MYR",
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      periodStart: fe.periodStart?.[0],
      periodEnd: fe.periodEnd?.[0],
      paymentDate: fe.paymentDate?.[0],
      currency: fe.currency?.[0],
    })
  }

  const { organizationId, userId } = session
  let periodId: string
  try {
    const result = await createPayrollPeriodMutation({
      organizationId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      paymentDate: parsed.data.paymentDate,
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
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "payroll_period",
        verb: "create",
      }),
      actorUserId: userId,
      organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: periodId,
      metadata: {
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
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
  const gate = await requireErpPermission({
    module: "hrm",
    object: "payroll",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const session = gate.session

  const parsed = updatePayrollPeriodFormSchema.safeParse({
    periodId: formData.get("periodId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    paymentDate: formData.get("paymentDate"),
    currency: formData.get("currency"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      periodStart: fe.periodStart?.[0],
      periodEnd: fe.periodEnd?.[0],
      paymentDate: fe.paymentDate?.[0],
      currency: fe.currency?.[0],
    })
  }

  const { organizationId, userId } = session
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
    paymentDate: parsed.data.paymentDate,
    currency: parsed.data.currency,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "payroll_period",
        verb: "update",
      }),
      actorUserId: userId,
      organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: parsed.data.periodId,
      metadata: { periodId: parsed.data.periodId },
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
  const gate = await requireHrmPermission({
    object: "payroll",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = preparePayrollRunsFormSchema.safeParse({
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      periodId: parsed.error.flatten().fieldErrors.periodId?.[0],
    })
  }

  const { organizationId, userId, sessionId } = session
  const period = await getPayrollPeriod(organizationId, parsed.data.periodId)
  if (!period) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (period.state !== "open") {
    return hrmActionFailure({
      form: "Period must be in open state to start preparation.",
    })
  }

  await updatePayrollPeriodState(
    organizationId,
    parsed.data.periodId,
    "preparing"
  )

  const employees = await db
    .selectDistinct({ employeeId: hrmEmployee.id })
    .from(hrmEmployee)
    .innerJoin(
      hrmPayrollProfile,
      and(
        eq(hrmPayrollProfile.organizationId, organizationId),
        eq(hrmPayrollProfile.employeeId, hrmEmployee.id)
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

    await insertPayrollRun(organizationId, parsed.data.periodId, employeeId, {
      contractId: contract?.id ?? null,
      profileId: profile?.id ?? null,
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
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "payroll_run",
        verb: "create",
      }),
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
// Lock payroll period (MYR + MY rule pack — Phase 3B)
// ---------------------------------------------------------------------------

export async function lockPayrollPeriodAction(
  _prev: LockPayrollPeriodFormState,
  formData: FormData
): Promise<LockPayrollPeriodFormState> {
  const gate = await requireHrmPermission({
    object: "payroll",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = lockPayrollPeriodFormSchema.safeParse({
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      periodId: parsed.error.flatten().fieldErrors.periodId?.[0],
    })
  }

  const { organizationId, userId, sessionId } = session
  const period = await getPayrollPeriod(organizationId, parsed.data.periodId)
  if (!period) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (period.state !== "preparing") {
    return hrmActionFailure({ form: "Period must be preparing to lock." })
  }
  if (period.currency !== "MYR") {
    return hrmActionFailure({
      form: "MYR payroll periods only — extend rule packs before locking other currencies.",
    })
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
      form: "Attendance days in this window must be computed or locked before payroll lock.",
    })
  }

  if (
    !(await hasApprovedPayrollPeriodLockApproval(
      organizationId,
      parsed.data.periodId
    ))
  ) {
    return hrmActionFailure({
      form: "Request and obtain approved lock certification before locking.",
    })
  }

  let rulePackVersion: string
  try {
    const periodEnd = new Date(`${period.periodEnd}T00:00:00.000Z`)
    rulePackVersion = resolveRulePack("MY", periodEnd).version
  } catch {
    return hrmActionFailure({
      form: "No Malaysia rule pack is registered for this period end date.",
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
      action: "erp.hrm.payroll.period.lock",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_payroll_period",
      resourceId: parsed.data.periodId,
      metadata: {
        periodId: parsed.data.periodId,
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

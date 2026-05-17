import "server-only"

import { and, eq, lte } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmploymentContract,
  hrmLifecycleEvent,
  hrmLifecycleTransition,
} from "#lib/db/schema"

import {
  formatUtcDateOnly,
  isoDateOnlyToUtcDate,
} from "../../../_module-governance/hrm-calendar-dates.server"
import {
  upsertEmployeeEffectiveAssignment,
  type EmployeeEffectiveAssignmentNext,
} from "../../employee-records-management/data/employee-assignment-command.server"
import { recordEmployeeRecordChangeHistory } from "../../employee-records-management/data/employee-record-history.server"
import { insertDefaultOffboardingInstance } from "../../offboarding-exit-management/data/offboarding.mutations.server"
import {
  assertEmploymentStatusTransition,
  type HrmEmploymentStatus,
  type HrmLifecycleEventKind,
  type HrmLifecycleMovementKind,
  type HrmLifecycleTransitionStatus,
  type HrmProbationOutcome,
  HRM_EMPLOYMENT_STATUSES,
} from "./employee-lifecycle-stage.shared"
import { createOffboardingInstanceForTermination } from "./boarding.mutations.server"
import { HRM_EMPLOYEE_LIFECYCLE_AUDIT } from "../employee-lifecycle.contract"

export type HrmLifecycleDbExecutor = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export type EmployeeLifecycleRow = {
  readonly id: string
  readonly employmentStatus: string
  readonly archivedAt: Date | null
  readonly probationEndDate: Date | null
  readonly confirmationDate: Date | null
  readonly suspendedAt: Date | null
  readonly suspensionReason: string | null
  readonly suspensionApprovalReference: string | null
  readonly resignationDate: Date | null
  readonly lastWorkingDate: Date | null
  readonly retirementDate: Date | null
  readonly currentDepartmentId: string | null
  readonly currentPositionId: string | null
  readonly currentJobGradeId: string | null
  readonly managerEmployeeId: string | null
  readonly currentEmploymentContractId: string | null
}

function parseEmploymentStatus(value: string): HrmEmploymentStatus {
  if ((HRM_EMPLOYMENT_STATUSES as readonly string[]).includes(value)) {
    return value as HrmEmploymentStatus
  }
  throw new Error(`Unknown employment status: ${value}`)
}

function isContractExpiryTerminalStatus(
  status: HrmEmploymentStatus
): boolean {
  return (
    status === "offboarding" ||
    status === "separated" ||
    status === "retired" ||
    status === "terminated"
  )
}

export async function loadEmployeeForLifecycleMutation(
  organizationId: string,
  employeeId: string
): Promise<EmployeeLifecycleRow | null> {
  const [row] = await db
    .select({
      id: hrmEmployee.id,
      employmentStatus: hrmEmployee.employmentStatus,
      archivedAt: hrmEmployee.archivedAt,
      probationEndDate: hrmEmployee.probationEndDate,
      confirmationDate: hrmEmployee.confirmationDate,
      suspendedAt: hrmEmployee.suspendedAt,
      suspensionReason: hrmEmployee.suspensionReason,
      suspensionApprovalReference: hrmEmployee.suspensionApprovalReference,
      resignationDate: hrmEmployee.resignationDate,
      lastWorkingDate: hrmEmployee.lastWorkingDate,
      retirementDate: hrmEmployee.retirementDate,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      currentPositionId: hrmEmployee.currentPositionId,
      currentJobGradeId: hrmEmployee.currentJobGradeId,
      managerEmployeeId: hrmEmployee.managerEmployeeId,
      currentEmploymentContractId: hrmEmployee.currentEmploymentContractId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, employeeId)
      )
    )
    .limit(1)

  return row ?? null
}

export function assertEmployeeEligibleForLifecycle(
  employee: EmployeeLifecycleRow
): void {
  if (employee.archivedAt) {
    throw new Error("Cannot change lifecycle state for an archived employee.")
  }
}

async function insertLifecycleEvent(
  tx: HrmLifecycleDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly kind: HrmLifecycleEventKind
    readonly previousStatus: string | null
    readonly newStatus: string | null
    readonly effectiveDate: Date
    readonly reason?: string | null
    readonly approvalReference?: string | null
    readonly metadata?: Record<string, unknown>
    readonly actorUserId: string
  }
): Promise<string> {
  const id = crypto.randomUUID()
  await tx.insert(hrmLifecycleEvent).values({
    id,
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    kind: input.kind,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    effectiveDate: input.effectiveDate,
    reason: input.reason ?? null,
    approvalReference: input.approvalReference ?? null,
    metadata: input.metadata ?? {},
    actorUserId: input.actorUserId,
    createdByUserId: input.actorUserId,
  })
  return id
}

type EmployeeLifecyclePatch = Partial<typeof hrmEmployee.$inferInsert>

type ScheduledLifecyclePayload = {
  readonly eventKind?: HrmLifecycleEventKind
  readonly employeePatch?: Record<string, unknown>
  readonly metadata?: Record<string, unknown>
  readonly extraEvents?: readonly {
    readonly kind: HrmLifecycleEventKind
    readonly reason?: string | null
  }[]
  readonly movementKind?: HrmLifecycleMovementKind
  readonly previousValues?: Record<string, unknown>
  readonly newValues?: Record<string, unknown>
}

const EMPLOYEE_LIFECYCLE_CHANGE_KEYS = [
  "employmentStatus",
  "probationEndDate",
  "confirmationDate",
  "suspendedAt",
  "suspensionReason",
  "suspensionApprovalReference",
  "resignationDate",
  "lastWorkingDate",
  "retirementDate",
] as const

const EMPLOYEE_ASSIGNMENT_KEYS = [
  "currentDepartmentId",
  "currentPositionId",
  "currentJobGradeId",
  "managerEmployeeId",
  "costCenterCode",
  "workLocationCode",
] as const

function hasOwnKey<K extends PropertyKey>(
  value: object,
  key: K
): value is Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function shouldApplyImmediately(effectiveDate: Date): boolean {
  return formatUtcDateOnly(effectiveDate) <= formatUtcDateOnly(new Date())
}

function isOffboardingTriggerStatus(status: HrmEmploymentStatus): boolean {
  return (
    status === "notice_period" ||
    status === "offboarding" ||
    status === "separated" ||
    status === "retired" ||
    status === "terminated"
  )
}

function lifecycleEventKindForStatus(
  status: HrmEmploymentStatus
): HrmLifecycleEventKind {
  switch (status) {
    case "terminated":
      return "termination"
    case "retired":
      return "retirement"
    case "suspended":
      return "suspension"
    case "notice_period":
      return "notice_period_start"
    case "separated":
      return "separation"
    default:
      return "separation"
  }
}

function canonicalWriteStatus(status: HrmEmploymentStatus): HrmEmploymentStatus {
  return status === "terminated" ? "separated" : status
}

function serializeEmployeePatch(
  patch: EmployeeLifecyclePatch | undefined
): Record<string, unknown> | undefined {
  if (!patch) return undefined
  const serialized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value instanceof Date) {
      serialized[key] = formatUtcDateOnly(value)
    } else {
      serialized[key] = value
    }
  }
  return serialized
}

function deserializeEmployeePatch(
  patch: Record<string, unknown> | undefined
): EmployeeLifecyclePatch | undefined {
  if (!patch) return undefined
  const parsed: EmployeeLifecyclePatch = {}
  for (const [key, value] of Object.entries(patch)) {
    if (
      value != null &&
      typeof value === "string" &&
      [
        "probationEndDate",
        "confirmationDate",
        "suspendedAt",
        "resignationDate",
        "lastWorkingDate",
        "retirementDate",
      ].includes(key)
    ) {
      parsed[key as keyof EmployeeLifecyclePatch] =
        isoDateOnlyToUtcDate(value) as never
    } else {
      parsed[key as keyof EmployeeLifecyclePatch] = value as never
    }
  }
  return parsed
}

function extractEffectiveAssignmentNext(
  newValues: Record<string, unknown> | undefined
): EmployeeEffectiveAssignmentNext {
  if (!newValues) return {}
  const next: Record<string, string | null> = {}
  for (const key of EMPLOYEE_ASSIGNMENT_KEYS) {
    if (!hasOwnKey(newValues, key)) continue
    const value = newValues[key]
    next[key] = typeof value === "string" && value.length > 0 ? value : null
  }
  return next as EmployeeEffectiveAssignmentNext
}

function hasEffectiveAssignmentNext(
  next: EmployeeEffectiveAssignmentNext
): boolean {
  return Object.keys(next).length > 0
}

function buildEmployeeChangeRows(
  employee: EmployeeLifecycleRow,
  patch: EmployeeLifecyclePatch
) {
  const changes: Array<{
    fieldName: string
    oldValue: unknown
    newValue: unknown
  }> = []
  for (const key of EMPLOYEE_LIFECYCLE_CHANGE_KEYS) {
    if (!hasOwnKey(patch, key)) continue
    changes.push({
      fieldName: key,
      oldValue: employee[key] ?? null,
      newValue: patch[key] ?? null,
    })
  }
  return changes
}

async function ensureLifecycleOffboardingTriggered(
  tx: HrmLifecycleDbExecutor,
  input: {
    readonly organizationId: string
    readonly employee: EmployeeLifecycleRow
    readonly effectiveDate: Date
    readonly actorUserId: string
    readonly contractId?: string | null
  }
): Promise<void> {
  await insertDefaultOffboardingInstance(tx, {
    organizationId: input.organizationId,
    employeeId: input.employee.id,
    terminationDate: input.effectiveDate,
    createdByUserId: input.actorUserId,
  })

  const contractId = input.contractId ?? input.employee.currentEmploymentContractId
  if (!contractId) return

  await createOffboardingInstanceForTermination(tx, {
    organizationId: input.organizationId,
    employeeId: input.employee.id,
    contractId,
    startDate: input.effectiveDate,
    actorUserId: input.actorUserId,
  })
}

async function insertScheduledLifecycleTransition(
  tx: HrmLifecycleDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly transitionKind: string
    readonly fromStatus: string | null
    readonly toStatus: string | null
    readonly effectiveDate: Date
    readonly payload: ScheduledLifecyclePayload
    readonly reason?: string | null
    readonly approvalReference?: string | null
    readonly actorUserId: string
  }
): Promise<string> {
  const [existing] = await tx
    .select({ id: hrmLifecycleTransition.id })
    .from(hrmLifecycleTransition)
    .where(
      and(
        eq(hrmLifecycleTransition.organizationId, input.organizationId),
        eq(hrmLifecycleTransition.employeeId, input.employeeId),
        eq(hrmLifecycleTransition.transitionKind, input.transitionKind),
        eq(hrmLifecycleTransition.effectiveDate, input.effectiveDate),
        eq(hrmLifecycleTransition.status, "pending")
      )
    )
    .limit(1)

  if (existing) {
    throw new Error(
      "A pending lifecycle transition already exists for this employee, date, and transition kind."
    )
  }

  const id = crypto.randomUUID()
  await tx.insert(hrmLifecycleTransition).values({
    id,
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    transitionKind: input.transitionKind,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    effectiveDate: input.effectiveDate,
    status: "pending",
    payload: {
      ...input.payload,
      employeePatch: serializeEmployeePatch(
        input.payload.employeePatch as EmployeeLifecyclePatch | undefined
      ),
    },
    reason: input.reason ?? null,
    approvalReference: input.approvalReference ?? null,
    actorUserId: input.actorUserId,
    createdByUserId: input.actorUserId,
    updatedByUserId: input.actorUserId,
  })

  await writeIamAuditEvent({
    action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.transition.scheduled,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    actorSessionId: null,
    resourceType: "hrm_lifecycle_transition",
    resourceId: id,
    metadata: {
      employeeId: input.employeeId,
      transitionKind: input.transitionKind,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      effectiveDate: formatUtcDateOnly(input.effectiveDate),
      reason: input.reason,
      approvalReference: input.approvalReference,
    },
  })

  await insertLifecycleEvent(tx, {
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    kind: "transition_scheduled",
    previousStatus: input.fromStatus,
    newStatus: input.toStatus,
    effectiveDate: input.effectiveDate,
    reason: input.reason ?? null,
    approvalReference: input.approvalReference ?? null,
    metadata: {
      transitionId: id,
      transitionKind: input.transitionKind,
    },
    actorUserId: input.actorUserId,
  })

  return id
}

async function applyStatusTransitionNowInTx(
  tx: HrmLifecycleDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly effectiveDate: Date
    readonly actorUserId: string
    readonly nextStatus: HrmEmploymentStatus
    readonly eventKind: HrmLifecycleEventKind
    readonly reason?: string | null
    readonly approvalReference?: string | null
    readonly employeePatch?: EmployeeLifecyclePatch
    readonly metadata?: Record<string, unknown>
    readonly contractId?: string
    readonly extraEvents?: readonly {
      readonly kind: HrmLifecycleEventKind
      readonly reason?: string | null
    }[]
  }
): Promise<string> {
  const employee = await loadEmployeeInTx(
    tx,
    input.organizationId,
    input.employeeId
  )
  assertEmployeeEligibleForLifecycle(employee)
  const fromStatus = parseEmploymentStatus(employee.employmentStatus)
  const nextStatus = canonicalWriteStatus(input.nextStatus)
  assertEmploymentStatusTransition(fromStatus, nextStatus)

  const patch: EmployeeLifecyclePatch = {
    employmentStatus: nextStatus,
    ...input.employeePatch,
    updatedAt: new Date(),
    updatedByUserId: input.actorUserId,
  }

  await tx
    .update(hrmEmployee)
    .set(patch)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )

  await recordEmployeeRecordChangeHistory(
    {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      changedByUserId: input.actorUserId,
      changes: buildEmployeeChangeRows(employee, patch),
      meta: {
        effectiveDate: input.effectiveDate,
        reason: input.reason ?? null,
        approvalReference: input.approvalReference ?? null,
      },
    },
    tx
  )

  const eventId = await insertLifecycleEvent(tx, {
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    kind: input.eventKind,
    previousStatus: fromStatus,
    newStatus: nextStatus,
    effectiveDate: input.effectiveDate,
    reason: input.reason ?? null,
    approvalReference: input.approvalReference ?? null,
    metadata: input.metadata,
    actorUserId: input.actorUserId,
  })

  for (const extra of input.extraEvents ?? []) {
    await insertLifecycleEvent(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      kind: extra.kind,
      previousStatus: fromStatus,
      newStatus: nextStatus,
      effectiveDate: input.effectiveDate,
      reason: extra.reason ?? input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
      metadata: input.metadata,
      actorUserId: input.actorUserId,
    })
  }

  if (isOffboardingTriggerStatus(nextStatus)) {
    await ensureLifecycleOffboardingTriggered(tx, {
      organizationId: input.organizationId,
      employee,
      effectiveDate: input.effectiveDate,
      actorUserId: input.actorUserId,
      contractId: input.contractId,
    })
  }

  return eventId
}

export async function triggerContractExpiryLifecycleTransition(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly contractId: string
  readonly effectiveDate: Date
  readonly actorUserId: string
  readonly reason?: string
}): Promise<"applied" | "skipped"> {
  const targetStatus: HrmEmploymentStatus = "offboarding"

  return db.transaction(async (tx) => {
    const employee = await loadEmployeeInTx(
      tx,
      input.organizationId,
      input.employeeId
    )
    assertEmployeeEligibleForLifecycle(employee)

    const currentStatus = parseEmploymentStatus(employee.employmentStatus)
    if (currentStatus === "offboarding" || isContractExpiryTerminalStatus(currentStatus)) {
      return "skipped"
    }

    try {
      await applyStatusTransitionNowInTx(tx, {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        effectiveDate: input.effectiveDate,
        actorUserId: input.actorUserId,
        nextStatus: targetStatus,
        eventKind: "offboarding_start",
        contractId: input.contractId,
        reason:
          input.reason ??
          `Employment contract ${input.contractId} reached effective end date.`,
        metadata: {
          contractId: input.contractId,
          effectiveDate: formatUtcDateOnly(input.effectiveDate),
          source: "contract_expiry_watch",
        },
      })
    } catch (err) {
      if (err instanceof Error && err.message.includes("Invalid employment status")) {
        return "skipped"
      }
      throw err
    }

    await writeIamAuditEvent({
      action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.contract.expiry_reached,
      organizationId: input.organizationId,
      actorUserId: null,
      actorSessionId: null,
      resourceType: "hrm_employment_contract",
      resourceId: input.contractId,
      metadata: {
        employeeId: input.employeeId,
        effectiveDate: formatUtcDateOnly(input.effectiveDate),
        reason: input.reason,
      },
    })

    return "applied"
  })
}

async function applyMovementNowInTx(
  tx: HrmLifecycleDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly movementKind: HrmLifecycleMovementKind
    readonly effectiveDate: Date
    readonly previousValues?: Record<string, unknown>
    readonly newValues?: Record<string, unknown>
    readonly reason?: string | null
    readonly approvalReference?: string | null
    readonly actorUserId: string
  }
): Promise<string> {
  const employee = await loadEmployeeInTx(
    tx,
    input.organizationId,
    input.employeeId
  )
  assertEmployeeEligibleForLifecycle(employee)

  const next = extractEffectiveAssignmentNext(input.newValues)
  if (hasEffectiveAssignmentNext(next)) {
    await upsertEmployeeEffectiveAssignment(
      {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        actorUserId: input.actorUserId,
        effectiveFrom: input.effectiveDate,
        next,
        meta: {
          effectiveDate: input.effectiveDate,
          reason: input.reason ?? null,
          approvalReference: input.approvalReference ?? null,
        },
      },
      tx
    )
  }

  return insertLifecycleEvent(tx, {
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    kind: input.movementKind,
    previousStatus: employee.employmentStatus,
    newStatus: employee.employmentStatus,
    effectiveDate: input.effectiveDate,
    reason: input.reason ?? null,
    approvalReference: input.approvalReference ?? null,
    metadata: {
      previousValues: input.previousValues ?? {},
      newValues: input.newValues ?? {},
    },
    actorUserId: input.actorUserId,
  })
}
export async function recordProbationOutcomeMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly contractId: string
  readonly outcome: HrmProbationOutcome
  readonly effectiveDate: string
  readonly newProbationEndDate?: string
  readonly terminationReason?: string
  readonly reviewerNote?: string
  readonly actorUserId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const employee = await loadEmployeeInTx(
      tx,
      input.organizationId,
      input.employeeId
    )
    assertEmployeeEligibleForLifecycle(employee)
    const fromStatus = parseEmploymentStatus(employee.employmentStatus)
    const effectiveDate = isoDateOnlyToUtcDate(input.effectiveDate)

    const [contract] = await tx
      .select({
        id: hrmEmploymentContract.id,
        state: hrmEmploymentContract.state,
      })
      .from(hrmEmploymentContract)
      .where(
        and(
          eq(hrmEmploymentContract.organizationId, input.organizationId),
          eq(hrmEmploymentContract.id, input.contractId),
          eq(hrmEmploymentContract.employeeId, input.employeeId)
        )
      )
      .limit(1)

    if (!contract) {
      throw new Error("Employment contract not found for this employee.")
    }

    const metadata: Record<string, unknown> = {
      outcome: input.outcome,
      contractId: input.contractId,
      reviewerNote: input.reviewerNote ?? null,
      terminationReason: input.terminationReason ?? null,
    }

    let nextStatus: HrmEmploymentStatus = fromStatus
    const employeePatch: Partial<typeof hrmEmployee.$inferInsert> = {
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    }

    if (input.outcome === "termination_recommended") {
      await insertLifecycleEvent(tx, {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        kind: "probation_outcome",
        previousStatus: fromStatus,
        newStatus: fromStatus,
        effectiveDate,
        reason: input.terminationReason ?? null,
        metadata,
        actorUserId: input.actorUserId,
      })
      return
    }

    if (input.outcome === "confirmed") {
      nextStatus = "confirmed"
      assertEmploymentStatusTransition(fromStatus, nextStatus)
      employeePatch.employmentStatus = nextStatus
      employeePatch.confirmationDate = effectiveDate
    } else if (input.outcome === "extended") {
      if (!input.newProbationEndDate) {
        throw new Error("New probation end date is required.")
      }
      const probationEnd = isoDateOnlyToUtcDate(input.newProbationEndDate)
      nextStatus = "probation"
      employeePatch.employmentStatus = nextStatus
      employeePatch.probationEndDate = probationEnd
      await tx
        .update(hrmEmploymentContract)
        .set({
          probationEndDate: probationEnd,
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        })
        .where(eq(hrmEmploymentContract.id, contract.id))
      await insertLifecycleEvent(tx, {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        kind: "probation_extended",
        previousStatus: fromStatus,
        newStatus: nextStatus,
        effectiveDate,
        reason: input.reviewerNote ?? null,
        metadata: {
          ...metadata,
          newProbationEndDate: input.newProbationEndDate,
        },
        actorUserId: input.actorUserId,
      })
    }

    await insertLifecycleEvent(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      kind: "probation_outcome",
      previousStatus: fromStatus,
      newStatus: nextStatus,
      effectiveDate,
      reason: input.terminationReason ?? input.reviewerNote ?? null,
      metadata,
      actorUserId: input.actorUserId,
    })

    if (input.outcome === "confirmed") {
      await insertLifecycleEvent(tx, {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        kind: "confirmation",
        previousStatus: fromStatus,
        newStatus: nextStatus,
        effectiveDate,
        reason: input.reviewerNote ?? null,
        metadata,
        actorUserId: input.actorUserId,
      })
    }

    if (input.outcome === "confirmed" || input.outcome === "extended") {
      await tx
        .update(hrmEmployee)
        .set(employeePatch)
        .where(
          and(
            eq(hrmEmployee.organizationId, input.organizationId),
            eq(hrmEmployee.id, input.employeeId)
          )
        )

      await recordEmployeeRecordChangeHistory(
        {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          changedByUserId: input.actorUserId,
          changes: buildEmployeeChangeRows(employee, employeePatch),
          meta: {
            effectiveDate,
            reason: input.terminationReason ?? input.reviewerNote ?? null,
          },
        },
        tx
      )
    }
  })
}

export async function confirmEmploymentMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly effectiveDate: string
  readonly confirmationNote?: string
  readonly actorUserId: string
}): Promise<void> {
  await applyStatusTransition({
    ...input,
    nextStatus: "confirmed",
    eventKind: "confirmation",
    employeePatch: {
      confirmationDate: isoDateOnlyToUtcDate(input.effectiveDate),
    },
    reason: input.confirmationNote,
  })
}

export async function suspendEmployeeMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly suspensionReason: string
  readonly approvalReference: string
  readonly effectiveDate: string
  readonly actorUserId: string
}): Promise<void> {
  const effectiveDate = isoDateOnlyToUtcDate(input.effectiveDate)
  await applyStatusTransition({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    effectiveDate: input.effectiveDate,
    actorUserId: input.actorUserId,
    nextStatus: "suspended",
    eventKind: "suspension",
    reason: input.suspensionReason,
    approvalReference: input.approvalReference,
    employeePatch: {
      suspendedAt: effectiveDate,
      suspensionReason: input.suspensionReason,
      suspensionApprovalReference: input.approvalReference,
    },
  })
}

export async function liftSuspensionMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly restoreToStatus: "active" | "confirmed" | "probation"
  readonly liftReason: string
  readonly effectiveDate: string
  readonly actorUserId: string
}): Promise<void> {
  await applyStatusTransition({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    effectiveDate: input.effectiveDate,
    actorUserId: input.actorUserId,
    nextStatus: input.restoreToStatus,
    eventKind: "suspension_lifted",
    reason: input.liftReason,
    employeePatch: {
      suspendedAt: null,
      suspensionReason: null,
      suspensionApprovalReference: null,
    },
  })
}

export async function recordResignationMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly resignationDate: string
  readonly lastWorkingDate: string
  readonly resignationNote?: string
  readonly actorUserId: string
}): Promise<void> {
  await applyStatusTransition({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    effectiveDate: input.resignationDate,
    actorUserId: input.actorUserId,
    nextStatus: "notice_period",
    eventKind: "resignation",
    reason: input.resignationNote,
    employeePatch: {
      resignationDate: isoDateOnlyToUtcDate(input.resignationDate),
      lastWorkingDate: isoDateOnlyToUtcDate(input.lastWorkingDate),
    },
    metadata: {
      lastWorkingDate: input.lastWorkingDate,
    },
    extraEvents: [
      {
        kind: "notice_period_start",
        reason: input.resignationNote ?? null,
      },
    ],
  })
}

export async function setLastWorkingDateMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly lastWorkingDate: string
  readonly reason?: string
  readonly actorUserId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const employee = await loadEmployeeInTx(
      tx,
      input.organizationId,
      input.employeeId
    )
    assertEmployeeEligibleForLifecycle(employee)
    const lastWorking = isoDateOnlyToUtcDate(input.lastWorkingDate)

    await tx
      .update(hrmEmployee)
      .set({
        lastWorkingDate: lastWorking,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmEmployee.organizationId, input.organizationId),
          eq(hrmEmployee.id, input.employeeId)
        )
      )

    await recordEmployeeRecordChangeHistory(
      {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        changedByUserId: input.actorUserId,
        changes: [
          {
            fieldName: "lastWorkingDate",
            oldValue: employee.lastWorkingDate,
            newValue: lastWorking,
          },
        ],
        meta: {
          effectiveDate: lastWorking,
          reason: input.reason ?? null,
        },
      },
      tx
    )

    await insertLifecycleEvent(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      kind: "resignation",
      previousStatus: employee.employmentStatus,
      newStatus: employee.employmentStatus,
      effectiveDate: lastWorking,
      reason: input.reason ?? null,
      metadata: { lastWorkingDate: input.lastWorkingDate },
      actorUserId: input.actorUserId,
    })
  })
}

export async function initiateTerminationMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly terminationReason: string
  readonly approvalReference: string
  readonly effectiveDate: string
  readonly lastWorkingDate?: string
  readonly actorUserId: string
}): Promise<void> {
  const employeePatch: Partial<typeof hrmEmployee.$inferInsert> = {}
  if (input.lastWorkingDate) {
    employeePatch.lastWorkingDate = isoDateOnlyToUtcDate(input.lastWorkingDate)
  }
  await applyStatusTransition({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    effectiveDate: input.effectiveDate,
    actorUserId: input.actorUserId,
    nextStatus: "separated",
    eventKind: "termination",
    reason: input.terminationReason,
    approvalReference: input.approvalReference,
    employeePatch,
  })
}

export async function recordRetirementMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly retirementDate: string
  readonly lastWorkingDate: string
  readonly retirementNote?: string
  readonly actorUserId: string
}): Promise<void> {
  await applyStatusTransition({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    effectiveDate: input.retirementDate,
    actorUserId: input.actorUserId,
    nextStatus: "retired",
    eventKind: "retirement",
    reason: input.retirementNote,
    employeePatch: {
      retirementDate: isoDateOnlyToUtcDate(input.retirementDate),
      lastWorkingDate: isoDateOnlyToUtcDate(input.lastWorkingDate),
    },
  })
}

export async function recordEmployeeMovementMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly movementKind: HrmLifecycleMovementKind
  readonly effectiveDate: string
  readonly previousValues?: Record<string, unknown>
  readonly newValues?: Record<string, unknown>
  readonly reason?: string
  readonly approvalReference?: string
  readonly actorUserId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const employee = await loadEmployeeInTx(
      tx,
      input.organizationId,
      input.employeeId
    )
    assertEmployeeEligibleForLifecycle(employee)
    const effectiveDate = isoDateOnlyToUtcDate(input.effectiveDate)

    if (!shouldApplyImmediately(effectiveDate)) {
      await insertScheduledLifecycleTransition(tx, {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        transitionKind: "movement",
        fromStatus: employee.employmentStatus,
        toStatus: employee.employmentStatus,
        effectiveDate,
        payload: {
          movementKind: input.movementKind,
          previousValues: input.previousValues ?? {},
          newValues: input.newValues ?? {},
        },
        reason: input.reason ?? null,
        approvalReference: input.approvalReference ?? null,
        actorUserId: input.actorUserId,
      })
      return
    }

    await applyMovementNowInTx(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      movementKind: input.movementKind,
      effectiveDate,
      previousValues: input.previousValues,
      newValues: input.newValues,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
      actorUserId: input.actorUserId,
    })
  })
}

export async function changeEmploymentStatusMutation(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly newStatus: HrmEmploymentStatus
  readonly reason: string
  readonly effectiveDate: string
  readonly actorUserId: string
}): Promise<void> {
  await applyStatusTransition({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    effectiveDate: input.effectiveDate,
    actorUserId: input.actorUserId,
    nextStatus: input.newStatus,
    eventKind: lifecycleEventKindForStatus(input.newStatus),
    reason: input.reason,
  })
}

async function applyStatusTransition(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly effectiveDate: string
  readonly actorUserId: string
  readonly nextStatus: HrmEmploymentStatus
  readonly eventKind: HrmLifecycleEventKind
  readonly reason?: string
  readonly approvalReference?: string
  readonly employeePatch?: EmployeeLifecyclePatch
  readonly metadata?: Record<string, unknown>
  readonly extraEvents?: readonly {
    readonly kind: HrmLifecycleEventKind
    readonly reason?: string | null
  }[]
}): Promise<void> {
  await db.transaction(async (tx) => {
    const employee = await loadEmployeeInTx(
      tx,
      input.organizationId,
      input.employeeId
    )
    assertEmployeeEligibleForLifecycle(employee)
    const fromStatus = parseEmploymentStatus(employee.employmentStatus)
    const nextStatus = canonicalWriteStatus(input.nextStatus)
    assertEmploymentStatusTransition(fromStatus, nextStatus)
    const effectiveDate = isoDateOnlyToUtcDate(input.effectiveDate)

    if (!shouldApplyImmediately(effectiveDate)) {
      await insertScheduledLifecycleTransition(tx, {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        transitionKind: input.eventKind,
        fromStatus,
        toStatus: nextStatus,
        effectiveDate,
        payload: {
          eventKind: input.eventKind,
          employeePatch: serializeEmployeePatch(input.employeePatch),
          metadata: input.metadata,
          extraEvents: input.extraEvents,
        },
        reason: input.reason ?? null,
        approvalReference: input.approvalReference ?? null,
        actorUserId: input.actorUserId,
      })
      return
    }

    await applyStatusTransitionNowInTx(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      effectiveDate,
      actorUserId: input.actorUserId,
      nextStatus,
      eventKind: input.eventKind,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
      employeePatch: input.employeePatch,
      metadata: input.metadata,
      extraEvents: input.extraEvents,
    })
  })
}

export type LifecycleTransitionDueTickSummary = {
  readonly scanned: number
  readonly applied: number
  readonly failed: number
  readonly skipped: number
}

type PendingLifecycleTransitionRow = {
  readonly id: string
  readonly organizationId: string
  readonly employeeId: string
  readonly transitionKind: string
  readonly fromStatus: string | null
  readonly toStatus: string | null
  readonly effectiveDate: Date
  readonly payload: Record<string, unknown>
  readonly reason: string | null
  readonly approvalReference: string | null
  readonly actorUserId: string | null
}

function parseScheduledPayload(
  value: Record<string, unknown>
): ScheduledLifecyclePayload {
  return value as ScheduledLifecyclePayload
}

async function applyPendingLifecycleTransitionInTx(
  tx: HrmLifecycleDbExecutor,
  row: PendingLifecycleTransitionRow
): Promise<string | null> {
  const payload = parseScheduledPayload(row.payload)
  const actorUserId = row.actorUserId ?? "system"

  if (row.transitionKind === "movement") {
    if (!payload.movementKind) {
      throw new Error("Scheduled movement transition is missing movement kind.")
    }
    return applyMovementNowInTx(tx, {
      organizationId: row.organizationId,
      employeeId: row.employeeId,
      movementKind: payload.movementKind,
      effectiveDate: row.effectiveDate,
      previousValues: payload.previousValues,
      newValues: payload.newValues,
      reason: row.reason,
      approvalReference: row.approvalReference,
      actorUserId,
    })
  }

  if (!row.toStatus) {
    throw new Error("Scheduled status transition is missing target status.")
  }

  const nextStatus = parseEmploymentStatus(row.toStatus)
  return applyStatusTransitionNowInTx(tx, {
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    effectiveDate: row.effectiveDate,
    actorUserId,
    nextStatus,
    eventKind: payload.eventKind ?? lifecycleEventKindForStatus(nextStatus),
    reason: row.reason,
    approvalReference: row.approvalReference,
    employeePatch: deserializeEmployeePatch(payload.employeePatch),
    metadata: payload.metadata,
    extraEvents: payload.extraEvents,
  })
}

export async function applyPendingLifecycleTransition(input: {
  readonly transitionId: string
}): Promise<"applied" | "skipped" | "failed"> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: hrmLifecycleTransition.id,
        organizationId: hrmLifecycleTransition.organizationId,
        employeeId: hrmLifecycleTransition.employeeId,
        transitionKind: hrmLifecycleTransition.transitionKind,
        fromStatus: hrmLifecycleTransition.fromStatus,
        toStatus: hrmLifecycleTransition.toStatus,
        effectiveDate: hrmLifecycleTransition.effectiveDate,
        payload: hrmLifecycleTransition.payload,
        reason: hrmLifecycleTransition.reason,
        approvalReference: hrmLifecycleTransition.approvalReference,
        actorUserId: hrmLifecycleTransition.actorUserId,
        status: hrmLifecycleTransition.status,
      })
      .from(hrmLifecycleTransition)
      .where(eq(hrmLifecycleTransition.id, input.transitionId))
      .limit(1)

    if (!row || row.status !== "pending") return "skipped"

    try {
      const lifecycleEventId = await applyPendingLifecycleTransitionInTx(tx, row)
      await insertLifecycleEvent(tx, {
        organizationId: row.organizationId,
        employeeId: row.employeeId,
        kind: "transition_applied",
        previousStatus: row.fromStatus,
        newStatus: row.toStatus,
        effectiveDate: row.effectiveDate,
        reason: row.reason,
        approvalReference: row.approvalReference,
        metadata: {
          transitionId: row.id,
          transitionKind: row.transitionKind,
          lifecycleEventId,
        },
        actorUserId: row.actorUserId ?? "system",
      })
      await tx
        .update(hrmLifecycleTransition)
        .set({
          status: "applied" satisfies HrmLifecycleTransitionStatus,
          lifecycleEventId,
          appliedAt: new Date(),
          updatedAt: new Date(),
          updatedByUserId: row.actorUserId,
        })
        .where(eq(hrmLifecycleTransition.id, row.id))
      return "applied"
    } catch (err) {
      await tx
        .update(hrmLifecycleTransition)
        .set({
          status: "failed" satisfies HrmLifecycleTransitionStatus,
          failureReason: err instanceof Error ? err.message : "Unknown error",
          updatedAt: new Date(),
          updatedByUserId: row.actorUserId,
        })
        .where(eq(hrmLifecycleTransition.id, row.id))
      return "failed"
    }
  })
}

export async function cancelPendingLifecycleTransition(input: {
  readonly transitionId: string
  readonly actorUserId: string
  readonly reason?: string
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(hrmLifecycleTransition)
      .set({
        status: "cancelled" satisfies HrmLifecycleTransitionStatus,
        cancelledAt: new Date(),
        failureReason: input.reason ?? null,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmLifecycleTransition.id, input.transitionId),
          eq(hrmLifecycleTransition.status, "pending")
        )
      )
      .returning({
        id: hrmLifecycleTransition.id,
        organizationId: hrmLifecycleTransition.organizationId,
        employeeId: hrmLifecycleTransition.employeeId,
        transitionKind: hrmLifecycleTransition.transitionKind,
        fromStatus: hrmLifecycleTransition.fromStatus,
        toStatus: hrmLifecycleTransition.toStatus,
        effectiveDate: hrmLifecycleTransition.effectiveDate,
        actorUserId: hrmLifecycleTransition.actorUserId,
        reason: hrmLifecycleTransition.reason,
        approvalReference: hrmLifecycleTransition.approvalReference,
      })

    if (!row) return false

    await writeIamAuditEvent({
      action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.transition.cancelled,
      organizationId: row.organizationId,
      actorUserId: input.actorUserId,
      actorSessionId: null,
      resourceType: "hrm_lifecycle_transition",
      resourceId: row.id,
      metadata: {
        transitionKind: row.transitionKind,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        effectiveDate: formatUtcDateOnly(row.effectiveDate),
        reason: input.reason ?? row.reason,
        approvalReference: row.approvalReference,
      },
    })

    await insertLifecycleEvent(tx, {
      organizationId: row.organizationId,
      employeeId: row.employeeId,
      kind: "transition_cancelled",
      previousStatus: row.fromStatus,
      newStatus: row.toStatus,
      effectiveDate: row.effectiveDate,
      reason: input.reason ?? row.reason,
      approvalReference: row.approvalReference,
      metadata: {
        transitionId: row.id,
        transitionKind: row.transitionKind,
      },
      actorUserId: input.actorUserId,
    })

    return true
  })
}

export async function runLifecycleTransitionDueTick(input?: {
  readonly now?: Date
  readonly batchLimit?: number
}): Promise<LifecycleTransitionDueTickSummary> {
  const now = input?.now ?? new Date()
  const dueDate = isoDateOnlyToUtcDate(formatUtcDateOnly(now))
  const rows = await db
    .select({
      id: hrmLifecycleTransition.id,
      organizationId: hrmLifecycleTransition.organizationId,
      employeeId: hrmLifecycleTransition.employeeId,
      transitionKind: hrmLifecycleTransition.transitionKind,
      effectiveDate: hrmLifecycleTransition.effectiveDate,
    })
    .from(hrmLifecycleTransition)
    .where(
      and(
        eq(hrmLifecycleTransition.status, "pending"),
        lte(hrmLifecycleTransition.effectiveDate, dueDate)
      )
    )
    .limit(input?.batchLimit ?? 300)

  let applied = 0
  let failed = 0
  let skipped = 0

  for (const row of rows) {
    const result = await applyPendingLifecycleTransition({
      transitionId: row.id,
    })
    if (result === "applied") {
      applied += 1
      await writeIamAuditEvent({
        action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.transition.applied,
        organizationId: row.organizationId,
        actorUserId: null,
        actorSessionId: null,
        resourceType: "hrm_lifecycle_transition",
        resourceId: row.id,
        metadata: {
          employeeId: row.employeeId,
          transitionKind: row.transitionKind,
          effectiveDate: formatUtcDateOnly(row.effectiveDate),
        },
      })
    } else if (result === "failed") failed += 1
    else skipped += 1
  }

  return {
    scanned: rows.length,
    applied,
    failed,
    skipped,
  }
}

async function loadEmployeeInTx(
  tx: HrmLifecycleDbExecutor,
  organizationId: string,
  employeeId: string
): Promise<EmployeeLifecycleRow> {
  const [row] = await tx
    .select({
      id: hrmEmployee.id,
      employmentStatus: hrmEmployee.employmentStatus,
      archivedAt: hrmEmployee.archivedAt,
      probationEndDate: hrmEmployee.probationEndDate,
      confirmationDate: hrmEmployee.confirmationDate,
      suspendedAt: hrmEmployee.suspendedAt,
      suspensionReason: hrmEmployee.suspensionReason,
      suspensionApprovalReference: hrmEmployee.suspensionApprovalReference,
      resignationDate: hrmEmployee.resignationDate,
      lastWorkingDate: hrmEmployee.lastWorkingDate,
      retirementDate: hrmEmployee.retirementDate,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      currentPositionId: hrmEmployee.currentPositionId,
      currentJobGradeId: hrmEmployee.currentJobGradeId,
      managerEmployeeId: hrmEmployee.managerEmployeeId,
      currentEmploymentContractId: hrmEmployee.currentEmploymentContractId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, employeeId)
      )
    )
    .limit(1)

  if (!row) {
    throw new Error("Employee not found.")
  }
  return row
}

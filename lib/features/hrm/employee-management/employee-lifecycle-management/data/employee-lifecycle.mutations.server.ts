import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmploymentContract,
  hrmLifecycleEvent,
} from "#lib/db/schema"

import { isoDateOnlyToUtcDate } from "../../../hrm-calendar-dates.server"
import {
  assertEmploymentStatusTransition,
  type HrmEmploymentStatus,
  type HrmLifecycleEventKind,
  type HrmLifecycleMovementKind,
  type HrmProbationOutcome,
  HRM_EMPLOYMENT_STATUSES,
} from "./employee-lifecycle-stage.shared"

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
}

function parseEmploymentStatus(value: string): HrmEmploymentStatus {
  if ((HRM_EMPLOYMENT_STATUSES as readonly string[]).includes(value)) {
    return value as HrmEmploymentStatus
  }
  throw new Error(`Unknown employment status: ${value}`)
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

function applyMovementFields(
  newValues: Record<string, unknown> | undefined
): Partial<typeof hrmEmployee.$inferInsert> {
  if (!newValues) return {}
  const patch: Partial<typeof hrmEmployee.$inferInsert> = {}
  const keys = [
    "currentDepartmentId",
    "currentPositionId",
    "currentJobGradeId",
    "managerEmployeeId",
  ] as const
  for (const key of keys) {
    const value = newValues[key]
    if (typeof value === "string" && value.length > 0) {
      patch[key] = value
    }
  }
  return patch
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
    const employee = await loadEmployeeInTx(tx, input.organizationId, input.employeeId)
    assertEmployeeEligibleForLifecycle(employee)
    const fromStatus = parseEmploymentStatus(employee.employmentStatus)
    const effectiveDate = isoDateOnlyToUtcDate(input.effectiveDate)

    const [contract] = await tx
      .select({ id: hrmEmploymentContract.id, state: hrmEmploymentContract.state })
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
        metadata: { ...metadata, newProbationEndDate: input.newProbationEndDate },
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
        .where(eq(hrmEmployee.id, input.employeeId))
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
  const now = new Date()
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
      suspendedAt: now,
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
  await db.transaction(async (tx) => {
    const employee = await loadEmployeeInTx(tx, input.organizationId, input.employeeId)
    assertEmployeeEligibleForLifecycle(employee)
    const fromStatus = parseEmploymentStatus(employee.employmentStatus)
    const nextStatus: HrmEmploymentStatus = "notice_period"
    assertEmploymentStatusTransition(fromStatus, nextStatus)
    const resignationEffective = isoDateOnlyToUtcDate(input.resignationDate)

    await tx
      .update(hrmEmployee)
      .set({
        employmentStatus: nextStatus,
        resignationDate: resignationEffective,
        lastWorkingDate: isoDateOnlyToUtcDate(input.lastWorkingDate),
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmEmployee.id, input.employeeId))

    await insertLifecycleEvent(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      kind: "resignation",
      previousStatus: fromStatus,
      newStatus: nextStatus,
      effectiveDate: resignationEffective,
      reason: input.resignationNote ?? null,
      actorUserId: input.actorUserId,
    })
    await insertLifecycleEvent(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      kind: "notice_period_start",
      previousStatus: fromStatus,
      newStatus: nextStatus,
      effectiveDate: resignationEffective,
      reason: input.resignationNote ?? null,
      actorUserId: input.actorUserId,
    })
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
    const employee = await loadEmployeeInTx(tx, input.organizationId, input.employeeId)
    assertEmployeeEligibleForLifecycle(employee)
    const lastWorking = isoDateOnlyToUtcDate(input.lastWorkingDate)

    await tx
      .update(hrmEmployee)
      .set({
        lastWorkingDate: lastWorking,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmEmployee.id, input.employeeId))

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
    nextStatus: "terminated",
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
    const employee = await loadEmployeeInTx(tx, input.organizationId, input.employeeId)
    assertEmployeeEligibleForLifecycle(employee)
    const effectiveDate = isoDateOnlyToUtcDate(input.effectiveDate)
    const movementPatch = applyMovementFields(input.newValues)

    await tx
      .update(hrmEmployee)
      .set({
        ...movementPatch,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmEmployee.id, input.employeeId))

    await insertLifecycleEvent(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      kind: input.movementKind,
      previousStatus: employee.employmentStatus,
      newStatus: employee.employmentStatus,
      effectiveDate,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
      metadata: {
        previousValues: input.previousValues ?? {},
        newValues: input.newValues ?? {},
      },
      actorUserId: input.actorUserId,
    })
  })
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
    default:
      return "separation"
  }
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
  readonly employeePatch?: Partial<typeof hrmEmployee.$inferInsert>
}): Promise<void> {
  await db.transaction(async (tx) => {
    const employee = await loadEmployeeInTx(tx, input.organizationId, input.employeeId)
    assertEmployeeEligibleForLifecycle(employee)
    const fromStatus = parseEmploymentStatus(employee.employmentStatus)
    assertEmploymentStatusTransition(fromStatus, input.nextStatus)
    const effectiveDate = isoDateOnlyToUtcDate(input.effectiveDate)

    await tx
      .update(hrmEmployee)
      .set({
        employmentStatus: input.nextStatus,
        ...input.employeePatch,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmEmployee.id, input.employeeId))

    await insertLifecycleEvent(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      kind: input.eventKind,
      previousStatus: fromStatus,
      newStatus: input.nextStatus,
      effectiveDate,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
      actorUserId: input.actorUserId,
    })
  })
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

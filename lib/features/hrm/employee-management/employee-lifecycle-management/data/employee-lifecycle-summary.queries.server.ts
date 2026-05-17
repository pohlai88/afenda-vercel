import "server-only"

import { and, desc, eq, gte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmLifecycleEvent,
  hrmLifecycleTransition,
} from "#lib/db/schema"

import {
  deriveLifecycleStage,
  normalizeHrmEmploymentStatusForRead,
  type EmployeeLifecycleStage,
} from "./employee-lifecycle-stage.shared"
import { listOpenBoardingInstancesForEmployee } from "./boarding.queries.server"
import { listOpenOffboardingForEmployee } from "../../offboarding-exit-management/data/offboarding.queries.server"

/**
 * Full lifecycle snapshot for a single employee.
 *
 * Used by the employee detail page chrome, payroll, leave, attendance,
 * compliance, IAM, and offboarding modules to read the current lifecycle
 * state without coupling directly to the `hrm_employee` table schema.
 *
 * HRM-LCY-002/027.
 */
export type EmployeeLifecycleSnapshot = {
  readonly stage: EmployeeLifecycleStage
  readonly employmentStatus: string
  readonly pendingTransitions: readonly EmployeeLifecyclePendingTransition[]
  readonly archivedAt: Date | null
  readonly openOnboardingCount: number
  readonly openOffboardingCount: number
  readonly openBoardingInstanceIds: readonly string[]
  readonly openOffboardingInstanceIds: readonly string[]
  // ── Suspension detail (HRM-LCY-017) ──────────────────────────────────
  /** Timestamp when suspension was initiated; null when not currently suspended. */
  readonly suspendedAt: Date | null
  /** Reason provided when suspension was initiated. */
  readonly suspensionReason: string | null
  /** HR approval reference for the suspension decision. */
  readonly suspensionApprovalReference: string | null
  // ── Resignation / last working date (HRM-LCY-018/019) ────────────────
  /** Date on which the employee formally resigned. */
  readonly resignationDate: Date | null
  /** Last calendar day of active employment. */
  readonly lastWorkingDate: Date | null
  // ── Retirement (HRM-LCY-022) ─────────────────────────────────────────
  /** Date of retirement; null if not retired. */
  readonly retirementDate: Date | null
}

export type EmployeeLifecyclePendingTransition = {
  readonly id: string
  readonly transitionKind: string
  readonly fromStatus: string | null
  readonly toStatus: string | null
  readonly effectiveDate: Date
  readonly reason: string | null
  readonly approvalReference: string | null
}

export type EmployeeLifecycleSnapshotOptions = {
  readonly asOfDate?: Date
  readonly includePending?: boolean
}

export async function getEmployeeLifecycleSnapshot(
  organizationId: string,
  employeeId: string,
  options?: EmployeeLifecycleSnapshotOptions
): Promise<EmployeeLifecycleSnapshot | null> {
  const [employee] = await db
    .select({
      employmentStatus: hrmEmployee.employmentStatus,
      archivedAt: hrmEmployee.archivedAt,
      suspendedAt: hrmEmployee.suspendedAt,
      suspensionReason: hrmEmployee.suspensionReason,
      suspensionApprovalReference: hrmEmployee.suspensionApprovalReference,
      resignationDate: hrmEmployee.resignationDate,
      lastWorkingDate: hrmEmployee.lastWorkingDate,
      retirementDate: hrmEmployee.retirementDate,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, employeeId)
      )
    )
    .limit(1)

  if (!employee) return null

  const pendingFilterDate = options?.asOfDate ?? new Date()
  const [boarding, offboarding, pendingTransitions] = await Promise.all([
    listOpenBoardingInstancesForEmployee(organizationId, employeeId),
    listOpenOffboardingForEmployee(organizationId, employeeId),
    options?.includePending
      ? listPendingLifecycleTransitions({
          organizationId,
          employeeId,
          asOfDate: pendingFilterDate,
        })
      : [],
  ])

  const openOnboarding = boarding.filter((row) => row.kind === "onboarding")
  const openBoardingOffboarding = boarding.filter(
    (row) => row.kind === "offboarding"
  )

  return {
    stage: deriveLifecycleStage({
      archivedAt: employee.archivedAt,
      employmentStatus: normalizeHrmEmploymentStatusForRead(
        employee.employmentStatus
      ),
      hasOpenOnboarding: openOnboarding.length > 0,
      hasOpenOffboarding:
        offboarding.length > 0 || openBoardingOffboarding.length > 0,
    }),
    employmentStatus: normalizeHrmEmploymentStatusForRead(
      employee.employmentStatus
    ),
    pendingTransitions,
    archivedAt: employee.archivedAt,
    openOnboardingCount: openOnboarding.length,
    openOffboardingCount: offboarding.length + openBoardingOffboarding.length,
    openBoardingInstanceIds: boarding.map((row) => row.id),
    openOffboardingInstanceIds: offboarding.map((row) => row.id),
    suspendedAt: employee.suspendedAt,
    suspensionReason: employee.suspensionReason,
    suspensionApprovalReference: employee.suspensionApprovalReference,
    resignationDate: employee.resignationDate,
    lastWorkingDate: employee.lastWorkingDate,
    retirementDate: employee.retirementDate,
  }
}

async function listPendingLifecycleTransitions(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly asOfDate: Date
}): Promise<EmployeeLifecyclePendingTransition[]> {
  return db
    .select({
      id: hrmLifecycleTransition.id,
      transitionKind: hrmLifecycleTransition.transitionKind,
      fromStatus: hrmLifecycleTransition.fromStatus,
      toStatus: hrmLifecycleTransition.toStatus,
      effectiveDate: hrmLifecycleTransition.effectiveDate,
      reason: hrmLifecycleTransition.reason,
      approvalReference: hrmLifecycleTransition.approvalReference,
    })
    .from(hrmLifecycleTransition)
    .where(
      and(
        eq(hrmLifecycleTransition.organizationId, input.organizationId),
        eq(hrmLifecycleTransition.employeeId, input.employeeId),
        eq(hrmLifecycleTransition.status, "pending"),
        gte(hrmLifecycleTransition.effectiveDate, input.asOfDate)
      )
    )
    .orderBy(hrmLifecycleTransition.effectiveDate)
}

export type EmployeeLifecycleHistoryRow = {
  readonly id: string
  readonly kind: string
  readonly previousStatus: string | null
  readonly newStatus: string | null
  readonly effectiveDate: Date | null
  readonly reason: string | null
  readonly approvalReference: string | null
  readonly metadata: Record<string, unknown> | null
  readonly actorUserId: string | null
  readonly createdAt: Date
}

export async function getEmployeeLifecycleHistory(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly limit?: number
}): Promise<EmployeeLifecycleHistoryRow[]> {
  return db
    .select({
      id: hrmLifecycleEvent.id,
      kind: hrmLifecycleEvent.kind,
      previousStatus: hrmLifecycleEvent.previousStatus,
      newStatus: hrmLifecycleEvent.newStatus,
      effectiveDate: hrmLifecycleEvent.effectiveDate,
      reason: hrmLifecycleEvent.reason,
      approvalReference: hrmLifecycleEvent.approvalReference,
      metadata: hrmLifecycleEvent.metadata,
      actorUserId: hrmLifecycleEvent.actorUserId,
      createdAt: hrmLifecycleEvent.createdAt,
    })
    .from(hrmLifecycleEvent)
    .where(
      and(
        eq(hrmLifecycleEvent.organizationId, input.organizationId),
        eq(hrmLifecycleEvent.employeeId, input.employeeId)
      )
    )
    .orderBy(desc(hrmLifecycleEvent.createdAt))
    .limit(input.limit ?? 100)
}

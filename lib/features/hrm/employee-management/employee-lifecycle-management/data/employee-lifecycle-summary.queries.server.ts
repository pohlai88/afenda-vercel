import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import {
  deriveLifecycleStage,
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

export async function getEmployeeLifecycleSnapshot(
  organizationId: string,
  employeeId: string
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

  const [boarding, offboarding] = await Promise.all([
    listOpenBoardingInstancesForEmployee(organizationId, employeeId),
    listOpenOffboardingForEmployee(organizationId, employeeId),
  ])

  const openOnboarding = boarding.filter((row) => row.kind === "onboarding")
  const openBoardingOffboarding = boarding.filter(
    (row) => row.kind === "offboarding"
  )

  return {
    stage: deriveLifecycleStage({
      archivedAt: employee.archivedAt,
      employmentStatus: employee.employmentStatus,
      hasOpenOnboarding: openOnboarding.length > 0,
      hasOpenOffboarding:
        offboarding.length > 0 || openBoardingOffboarding.length > 0,
    }),
    employmentStatus: employee.employmentStatus,
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

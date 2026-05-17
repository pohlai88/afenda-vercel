import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import {
  deriveOffboardingTaskStatus,
  isOffboardingChecklistComplete,
  type HrmOffboardingInstanceStatus,
} from "./offboarding-exit-status.shared"
import { listOpenOffboardingForEmployee } from "./offboarding.queries.server"
import type { OffboardingChecklistTask } from "./offboarding-defaults.shared"

export type OffboardingExitSnapshot = {
  readonly employeeId: string
  readonly employmentStatus: string
  readonly archivedAt: Date | null
  readonly resignationDate: Date | null
  readonly lastWorkingDate: Date | null
  readonly openInstanceCount: number
  readonly instances: readonly {
    readonly id: string
    readonly status: HrmOffboardingInstanceStatus | string
    readonly exitType: string | null
    readonly exitReason: string | null
    readonly terminationDate: string
    readonly lastWorkingDate: string | null
    readonly noticeStartDate: string | null
    readonly noticeEndDate: string | null
    readonly settlementReadinessStatus: string
    readonly rehireEligibility: string | null
    readonly exitInterviewScheduledAt: Date | null
    readonly exitInterviewCompletedAt: Date | null
    readonly checklist: readonly OffboardingChecklistTask[]
    readonly pendingTaskCount: number
    readonly overdueTaskCount: number
    readonly isComplete: boolean
  }[]
}

export async function getOffboardingExitSnapshot(
  organizationId: string,
  employeeId: string
): Promise<OffboardingExitSnapshot | null> {
  const [employee] = await db
    .select({
      id: hrmEmployee.id,
      employmentStatus: hrmEmployee.employmentStatus,
      archivedAt: hrmEmployee.archivedAt,
      resignationDate: hrmEmployee.resignationDate,
      lastWorkingDate: hrmEmployee.lastWorkingDate,
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

  const instances = await listOpenOffboardingForEmployee(
    organizationId,
    employeeId
  )

  const now = new Date()

  return {
    employeeId: employee.id,
    employmentStatus: employee.employmentStatus,
    archivedAt: employee.archivedAt,
    resignationDate: employee.resignationDate,
    lastWorkingDate: employee.lastWorkingDate,
    openInstanceCount: instances.length,
    instances: instances.map((instance) => {
      const taskStatuses = instance.checklist.map((task) =>
        deriveOffboardingTaskStatus({
          completedAt: task.completedAt,
          dueDate: task.dueDate,
          now,
        })
      )
      const pendingTaskCount = taskStatuses.filter(
        (s) => s === "pending" || s === "in_progress" || s === "overdue"
      ).length
      const overdueTaskCount = taskStatuses.filter((s) => s === "overdue").length

      return {
        id: instance.id,
        status: instance.status,
        exitType: instance.exitType,
        exitReason: instance.exitReason,
        terminationDate: instance.terminationDate,
        lastWorkingDate: instance.lastWorkingDate,
        noticeStartDate: instance.noticeStartDate,
        noticeEndDate: instance.noticeEndDate,
        settlementReadinessStatus: instance.settlementReadinessStatus,
        rehireEligibility: instance.rehireEligibility,
        exitInterviewScheduledAt: instance.exitInterviewScheduledAt,
        exitInterviewCompletedAt: instance.exitInterviewCompletedAt,
        checklist: instance.checklist,
        pendingTaskCount,
        overdueTaskCount,
        isComplete: isOffboardingChecklistComplete(instance.checklist),
      }
    }),
  }
}

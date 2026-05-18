import "server-only"

import { and, desc, eq, inArray, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBoardingTask,
  hrmEmployee,
  hrmOffboardingInstance,
} from "#lib/db/schema"

import { HRM_OFFBOARDING_ACTIVE_STATUSES } from "./offboarding-exit-status.shared"
import type { OffboardingChecklistTask } from "./offboarding-defaults.shared"
import { readOffboardingInstanceDetails } from "./offboarding-instance-metadata.server"

export type OffboardingDashboardRow = {
  readonly id: string
  readonly employeeId: string
  readonly employeeNumber: string | null
  readonly legalName: string
  readonly status: string
  readonly exitType: string | null
  readonly terminationDate: string
  readonly lastWorkingDate: string | null
  readonly settlementReadinessStatus: string
  readonly pendingTaskCount: number
  readonly overdueTaskCount: number
  readonly updatedAt: Date
}

export async function listOffboardingInstancesForOrgDashboard(
  organizationId: string,
  input?: {
    readonly statuses?: readonly string[]
    readonly exitType?: string
    readonly departmentId?: string
    readonly managerEmployeeId?: string
    readonly legalEntityCode?: string
    readonly lastWorkingOnOrBefore?: string
    readonly limit?: number
  }
): Promise<OffboardingDashboardRow[]> {
  const statuses = input?.statuses ?? [...HRM_OFFBOARDING_ACTIVE_STATUSES]
  const limit = input?.limit ?? 100
  const now = new Date()
  const lastWorkingCutoff = input?.lastWorkingOnOrBefore
    ? new Date(`${input.lastWorkingOnOrBefore}T00:00:00.000Z`)
    : null

  const predicates = [
    eq(hrmOffboardingInstance.organizationId, organizationId),
    inArray(hrmOffboardingInstance.status, [...statuses]),
  ]
  if (input?.exitType) {
    predicates.push(eq(hrmOffboardingInstance.exitType, input.exitType))
  }
  if (input?.departmentId) {
    predicates.push(eq(hrmEmployee.currentDepartmentId, input.departmentId))
  }
  if (input?.managerEmployeeId) {
    predicates.push(eq(hrmEmployee.managerEmployeeId, input.managerEmployeeId))
  }
  if (lastWorkingCutoff && !Number.isNaN(lastWorkingCutoff.getTime())) {
    predicates.push(
      lte(hrmOffboardingInstance.lastWorkingDate, lastWorkingCutoff)
    )
  }

  const rows = await db
    .select({
      id: hrmOffboardingInstance.id,
      employeeId: hrmOffboardingInstance.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      status: hrmOffboardingInstance.status,
      exitType: hrmOffboardingInstance.exitType,
      terminationDate: hrmOffboardingInstance.terminationDate,
      lastWorkingDate: hrmOffboardingInstance.lastWorkingDate,
      settlementReadinessStatus:
        hrmOffboardingInstance.settlementReadinessStatus,
      boardingInstanceId: hrmOffboardingInstance.boardingInstanceId,
      checklist: hrmOffboardingInstance.checklist,
      audit7w1h: hrmOffboardingInstance.audit7w1h,
      updatedAt: hrmOffboardingInstance.updatedAt,
    })
    .from(hrmOffboardingInstance)
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmOffboardingInstance.employeeId)
    )
    .where(and(...predicates))
    .orderBy(desc(hrmOffboardingInstance.updatedAt))
    .limit(limit)

  const boardingInstanceIds = rows
    .map((row) => row.boardingInstanceId)
    .filter((id): id is string => Boolean(id))
  const taskRows =
    boardingInstanceIds.length > 0
      ? await db
          .select({
            instanceId: hrmBoardingTask.instanceId,
            status: hrmBoardingTask.status,
            dueAt: hrmBoardingTask.dueAt,
          })
          .from(hrmBoardingTask)
          .where(
            and(
              eq(hrmBoardingTask.organizationId, organizationId),
              inArray(hrmBoardingTask.instanceId, boardingInstanceIds)
            )
          )
      : []
  const taskCountsByInstanceId = new Map<
    string,
    { pendingTaskCount: number; overdueTaskCount: number }
  >()
  for (const task of taskRows) {
    const counts = taskCountsByInstanceId.get(task.instanceId) ?? {
      pendingTaskCount: 0,
      overdueTaskCount: 0,
    }
    if (task.status !== "completed" && task.status !== "waived") {
      counts.pendingTaskCount += 1
      if (task.dueAt && task.dueAt < now) {
        counts.overdueTaskCount += 1
      }
    }
    taskCountsByInstanceId.set(task.instanceId, counts)
  }

  const mapped = rows.map((row) => {
    const checklist = (row.checklist as OffboardingChecklistTask[]) ?? []
    const details = readOffboardingInstanceDetails(row.audit7w1h)
    const terminationDate = row.terminationDate.toISOString().slice(0, 10)
    const lastWorkingDate =
      row.lastWorkingDate?.toISOString().slice(0, 10) ?? details.lastWorkingDate

    let overdueTaskCount = 0
    let pendingTaskCount = 0
    const normalizedCounts = row.boardingInstanceId
      ? taskCountsByInstanceId.get(row.boardingInstanceId)
      : null
    if (normalizedCounts) {
      pendingTaskCount = normalizedCounts.pendingTaskCount
      overdueTaskCount = normalizedCounts.overdueTaskCount
    } else {
      for (const task of checklist) {
        if (task.completedAt || task.status === "waived") continue
        pendingTaskCount += 1
        if (task.dueDate && new Date(task.dueDate) < now) {
          overdueTaskCount += 1
        }
      }
    }

    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeNumber: row.employeeNumber,
      legalName: row.legalName,
      status: row.status,
      exitType: row.exitType ?? details.exitType,
      terminationDate,
      lastWorkingDate,
      settlementReadinessStatus:
        row.settlementReadinessStatus ?? details.settlementReadinessStatus,
      pendingTaskCount,
      overdueTaskCount,
      updatedAt: row.updatedAt,
    }
  })

  return mapped
}

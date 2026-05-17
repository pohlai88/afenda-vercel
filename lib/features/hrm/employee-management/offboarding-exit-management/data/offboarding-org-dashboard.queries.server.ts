import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmOffboardingInstance } from "#lib/db/schema"

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
    readonly lastWorkingOnOrBefore?: string
    readonly limit?: number
  }
): Promise<OffboardingDashboardRow[]> {
  const statuses = input?.statuses ?? [...HRM_OFFBOARDING_ACTIVE_STATUSES]
  const limit = input?.limit ?? 100
  const now = new Date()

  const predicates = [
    eq(hrmOffboardingInstance.organizationId, organizationId),
    inArray(hrmOffboardingInstance.status, [...statuses]),
  ]

  const needsMetadataFilter =
    Boolean(input?.exitType) || Boolean(input?.lastWorkingOnOrBefore)

  const rows = await db
    .select({
      id: hrmOffboardingInstance.id,
      employeeId: hrmOffboardingInstance.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      status: hrmOffboardingInstance.status,
      terminationDate: hrmOffboardingInstance.terminationDate,
      checklist: hrmOffboardingInstance.checklist,
      audit7w1h: hrmOffboardingInstance.audit7w1h,
      updatedAt: hrmOffboardingInstance.updatedAt,
    })
    .from(hrmOffboardingInstance)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmOffboardingInstance.employeeId))
    .where(and(...predicates))
    .orderBy(desc(hrmOffboardingInstance.updatedAt))
    .limit(needsMetadataFilter ? Math.max(limit * 3, limit) : limit)

  const mapped = rows.map((row) => {
    const checklist = (row.checklist as OffboardingChecklistTask[]) ?? []
    const details = readOffboardingInstanceDetails(row.audit7w1h)
    const td = row.terminationDate as unknown
    const terminationDate =
      td instanceof Date
        ? td.toISOString().slice(0, 10)
        : typeof td === "string"
          ? td.slice(0, 10)
          : String(td).slice(0, 10)
    const lastWorkingDate = details.lastWorkingDate

    let overdueTaskCount = 0
    let pendingTaskCount = 0
    for (const task of checklist) {
      if (task.completedAt) continue
      pendingTaskCount += 1
      if (task.dueDate && new Date(task.dueDate) < now) {
        overdueTaskCount += 1
      }
    }

    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeNumber: row.employeeNumber,
      legalName: row.legalName,
      status: row.status,
      exitType: details.exitType,
      terminationDate,
      lastWorkingDate,
      settlementReadinessStatus: details.settlementReadinessStatus,
      pendingTaskCount,
      overdueTaskCount,
      updatedAt: row.updatedAt,
    }
  })

  return mapped
    .filter((row) => !input?.exitType || row.exitType === input.exitType)
    .filter(
      (row) =>
        !input?.lastWorkingOnOrBefore ||
        (row.lastWorkingDate !== null &&
          row.lastWorkingDate <= input.lastWorkingOnOrBefore)
    )
    .slice(0, limit)
}

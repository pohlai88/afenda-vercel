import "server-only"

import { and, desc, eq, inArray, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmOffboardingInstance } from "#lib/db/schema"

import { HRM_OFFBOARDING_ACTIVE_STATUSES } from "./offboarding-exit-status.shared"
import type { OffboardingChecklistTask } from "./offboarding-defaults.shared"

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

  if (input?.exitType) {
    predicates.push(eq(hrmOffboardingInstance.exitType, input.exitType))
  }

  if (input?.lastWorkingOnOrBefore) {
    const [y, m, d] = input.lastWorkingOnOrBefore.split("-").map(Number)
    predicates.push(
      lte(
        hrmOffboardingInstance.lastWorkingDate,
        new Date(Date.UTC(y, m - 1, d))
      )
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
      checklist: hrmOffboardingInstance.checklist,
      updatedAt: hrmOffboardingInstance.updatedAt,
    })
    .from(hrmOffboardingInstance)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmOffboardingInstance.employeeId))
    .where(and(...predicates))
    .orderBy(desc(hrmOffboardingInstance.updatedAt))
    .limit(limit)

  return rows.map((row) => {
    const checklist = (row.checklist as OffboardingChecklistTask[]) ?? []
    const td = row.terminationDate as unknown
    const terminationDate =
      td instanceof Date
        ? td.toISOString().slice(0, 10)
        : typeof td === "string"
          ? td.slice(0, 10)
          : String(td).slice(0, 10)
    const lwd = row.lastWorkingDate as unknown
    const lastWorkingDate =
      lwd instanceof Date
        ? lwd.toISOString().slice(0, 10)
        : lwd == null
          ? null
          : typeof lwd === "string"
            ? lwd.slice(0, 10)
            : String(lwd).slice(0, 10)

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
      exitType: row.exitType,
      terminationDate,
      lastWorkingDate,
      settlementReadinessStatus: row.settlementReadinessStatus,
      pendingTaskCount,
      overdueTaskCount,
      updatedAt: row.updatedAt,
    }
  })
}

import "server-only"

import { db } from "#lib/db"
import { hrmEmployeeChangeHistory, hrmLifecycleEvent } from "#lib/db/schema"

import { buildEmployeeMasterChangeRows } from "./employee-master-history.shared"

export type EmployeeRecordHistoryClient = Pick<typeof db, "insert">

export type EmployeeRecordChange = {
  readonly fieldName: string
  readonly oldValue: unknown
  readonly newValue: unknown
}

export type EmployeeRecordChangeMeta = {
  readonly effectiveDate?: Date | null
  readonly reason?: string | null
  readonly approvalReference?: string | null
}

export async function recordEmployeeRecordChangeHistory(
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly changedByUserId: string
    readonly changes: readonly EmployeeRecordChange[]
    readonly meta?: EmployeeRecordChangeMeta
  },
  client: EmployeeRecordHistoryClient = db
): Promise<string[]> {
  const rows = buildEmployeeMasterChangeRows({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    changedByUserId: input.changedByUserId,
    changes: [...input.changes],
  }).map((row) => ({
    id: crypto.randomUUID(),
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    fieldName: row.fieldName,
    oldValue: row.oldValue,
    newValue: row.newValue,
    changedByUserId: row.changedByUserId,
    effectiveDate: input.meta?.effectiveDate ?? null,
    reason: input.meta?.reason ?? null,
    approvalReference: input.meta?.approvalReference ?? null,
  }))

  if (rows.length === 0) return []

  await client.insert(hrmEmployeeChangeHistory).values(rows)
  return rows.map((row) => row.fieldName)
}

export async function recordEmployeeLifecycleEvent(
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly kind: string
    readonly previousStatus?: string | null
    readonly newStatus?: string | null
    readonly effectiveDate?: Date | null
    readonly reason?: string | null
    readonly approvalReference?: string | null
    readonly metadata?: Record<string, unknown> | null
    readonly actorUserId?: string | null
    readonly isEffectiveDated?: boolean
  },
  client: EmployeeRecordHistoryClient = db
): Promise<void> {
  await client.insert(hrmLifecycleEvent).values({
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    kind: input.kind,
    previousStatus: input.previousStatus ?? null,
    newStatus: input.newStatus ?? null,
    effectiveDate: input.effectiveDate ?? null,
    reason: input.reason ?? null,
    approvalReference: input.approvalReference ?? null,
    metadata: input.metadata ?? null,
    actorUserId: input.actorUserId ?? null,
    isEffectiveDated: input.isEffectiveDated ?? Boolean(input.effectiveDate),
    createdByUserId: input.actorUserId ?? null,
  })
}

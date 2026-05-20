import "server-only"

import { cache } from "react"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmEmployee,
  hrmFlexibleWorkArrangementType,
  hrmFlexibleWorkRequest,
} from "#lib/db/schema"
import { listUserIdsWithErpPermission } from "#features/erp-rbac/server"

import type { HrmFwaRequestState } from "../schemas/fwa-workflow-state.shared"
import { hrmFwaRequestStateSchema } from "../schemas/fwa-workflow-state.shared"
import { FWA_REQUEST_APPROVAL_SUBJECT_KIND } from "../fwa.contract"
import { countFwaComplianceGaps } from "./fwa-compliance.server"
import type {
  FwaArrangementTypeChoiceRow,
  FwaEmployeeChoiceRow,
  FwaOrgSummaryCounts,
  OrgFwaRequestRow,
} from "./fwa.types.shared"

export type {
  FwaArrangementTypeChoiceRow,
  FwaEmployeeChoiceRow,
  FwaOrgSummaryCounts,
  OrgFwaRequestRow,
} from "./fwa.types.shared"

export type FwaEmployeeContextRow = {
  id: string
  employeeNumber: string | null
  legalName: string
  managerEmployeeId: string | null
  archivedAt: Date | null
}

export async function listActiveEmployeeChoicesForFwa(
  organizationId: string
): Promise<FwaEmployeeChoiceRow[]> {
  return db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )
    .orderBy(asc(hrmEmployee.employeeNumber))
}

export async function listActiveFwaArrangementTypes(
  organizationId: string
): Promise<FwaArrangementTypeChoiceRow[]> {
  return db
    .select({
      id: hrmFlexibleWorkArrangementType.id,
      code: hrmFlexibleWorkArrangementType.code,
      label: hrmFlexibleWorkArrangementType.label,
      arrangementKind: hrmFlexibleWorkArrangementType.arrangementKind,
      requiresRemoteLocation:
        hrmFlexibleWorkArrangementType.requiresRemoteLocation,
      requiresSupportingDocument:
        hrmFlexibleWorkArrangementType.requiresSupportingDocument,
    })
    .from(hrmFlexibleWorkArrangementType)
    .where(
      and(
        eq(hrmFlexibleWorkArrangementType.organizationId, organizationId),
        isNull(hrmFlexibleWorkArrangementType.archivedAt)
      )
    )
    .orderBy(asc(hrmFlexibleWorkArrangementType.code))
}

export const findFwaEmployeeForUser = cache(async function findFwaEmployeeForUser(
  organizationId: string,
  userId: string
): Promise<FwaEmployeeContextRow | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.linkedUserId, userId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      managerEmployeeId: true,
      archivedAt: true,
    },
  })

  return row ?? null
})

export async function getFwaEmployeeForOrg(
  organizationId: string,
  employeeId: string
): Promise<FwaEmployeeContextRow | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.id, employeeId)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      managerEmployeeId: true,
      archivedAt: true,
    },
  })

  return row ?? null
}

export async function getFwaArrangementTypeForOrg(
  organizationId: string,
  arrangementTypeId: string
) {
  return db.query.hrmFlexibleWorkArrangementType.findFirst({
    where: and(
      eq(hrmFlexibleWorkArrangementType.organizationId, organizationId),
      eq(hrmFlexibleWorkArrangementType.id, arrangementTypeId)
    ),
  })
}

async function resolveManagerApproverUserId(input: {
  organizationId: string
  managerEmployeeId: string | null
}): Promise<string | null> {
  if (!input.managerEmployeeId) return null

  const manager = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.managerEmployeeId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: { linkedUserId: true },
  })

  return manager?.linkedUserId ?? null
}

export async function resolveFwaApproverUserId(input: {
  organizationId: string
  managerEmployeeId: string | null
}): Promise<string | null> {
  const managerUserId = await resolveManagerApproverUserId(input)
  if (managerUserId) return managerUserId

  const [fallbackApproverUserId] = await listUserIdsWithErpPermission({
    organizationId: input.organizationId,
    permission: {
      module: "hrm",
      object: "flexible_work",
      function: "update",
    },
  })

  return fallbackApproverUserId ?? null
}

export async function listFwaRequestsForOrg(
  organizationId: string,
  options: {
    states?: readonly HrmFwaRequestState[]
    limit?: number
    assignedApproverUserId?: string
    employeeId?: string
  } = {}
): Promise<OrgFwaRequestRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const stateFilter =
    options.states && options.states.length > 0
      ? inArray(hrmFlexibleWorkRequest.state, [...options.states])
      : undefined

  const assignedRequestIds = options.assignedApproverUserId
    ? (
        await db.query.hrmApproval.findMany({
          where: and(
            eq(hrmApproval.organizationId, organizationId),
            eq(hrmApproval.subjectKind, FWA_REQUEST_APPROVAL_SUBJECT_KIND),
            eq(hrmApproval.state, "pending"),
            eq(
              hrmApproval.currentApproverUserId,
              options.assignedApproverUserId
            )
          ),
          columns: { subjectId: true },
        })
      ).map((row) => row.subjectId)
    : null

  if (assignedRequestIds && assignedRequestIds.length === 0) return []

  const requests = await db.query.hrmFlexibleWorkRequest.findMany({
    where: and(
      eq(hrmFlexibleWorkRequest.organizationId, organizationId),
      stateFilter,
      options.employeeId
        ? eq(hrmFlexibleWorkRequest.employeeId, options.employeeId)
        : undefined,
      assignedRequestIds
        ? inArray(hrmFlexibleWorkRequest.id, assignedRequestIds)
        : undefined
    ),
    columns: {
      id: true,
      employeeId: true,
      arrangementTypeId: true,
      requestedAt: true,
      reason: true,
      startDate: true,
      endDate: true,
      remoteLocation: true,
      state: true,
      currentApprovalId: true,
    },
    orderBy: [desc(hrmFlexibleWorkRequest.requestedAt)],
    limit,
  })

  if (requests.length === 0) return []

  const employeeIds = [...new Set(requests.map((row) => row.employeeId))]
  const typeIds = [...new Set(requests.map((row) => row.arrangementTypeId))]
  const approvalIds = [
    ...new Set(
      requests.flatMap((row) =>
        row.currentApprovalId ? [row.currentApprovalId] : []
      )
    ),
  ]

  const [employees, types, approvals] = await Promise.all([
    db.query.hrmEmployee.findMany({
      where: and(
        eq(hrmEmployee.organizationId, organizationId),
        inArray(hrmEmployee.id, employeeIds)
      ),
      columns: { id: true, employeeNumber: true, legalName: true },
    }),
    db.query.hrmFlexibleWorkArrangementType.findMany({
      where: and(
        eq(hrmFlexibleWorkArrangementType.organizationId, organizationId),
        inArray(hrmFlexibleWorkArrangementType.id, typeIds)
      ),
      columns: { id: true, code: true, label: true, arrangementKind: true },
    }),
    approvalIds.length > 0
      ? db.query.hrmApproval.findMany({
          where: and(
            eq(hrmApproval.organizationId, organizationId),
            inArray(hrmApproval.id, approvalIds)
          ),
          columns: { id: true, currentApproverUserId: true },
        })
      : Promise.resolve([]),
  ])

  const employeeMap = new Map(
    employees.map((employee) => [
      employee.id,
      { number: employee.employeeNumber, name: employee.legalName },
    ])
  )
  const typeMap = new Map(types.map((type) => [type.id, type]))
  const approvalMap = new Map(
    approvals.map((approval) => [approval.id, approval.currentApproverUserId])
  )

  return requests.map((row) => {
    const type = typeMap.get(row.arrangementTypeId)
    const employee = employeeMap.get(row.employeeId)
    const parsedState = hrmFwaRequestStateSchema.safeParse(row.state)
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeNumber: employee?.number ?? null,
      employeeFullName: employee?.name ?? null,
      arrangementTypeId: row.arrangementTypeId,
      arrangementTypeCode: type?.code ?? "",
      arrangementTypeLabel: type?.label ?? "",
      arrangementKind: type?.arrangementKind ?? "",
      requestedAt: row.requestedAt,
      reason: row.reason,
      startDate: row.startDate,
      endDate: row.endDate,
      remoteLocation: row.remoteLocation,
      state: parsedState.success ? parsedState.data : "submitted",
      currentApprovalId: row.currentApprovalId,
      currentApproverUserId: row.currentApprovalId
        ? (approvalMap.get(row.currentApprovalId) ?? null)
        : null,
    }
  })
}

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function countFwaOrgSummary(
  organizationId: string
): Promise<FwaOrgSummaryCounts> {
  const today = new Date().toISOString().slice(0, 10)
  const within30 = addDaysIso(today, 30)

  const [pendingRow, activeRow, typesRow, expiringRow, complianceGapCount] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(hrmFlexibleWorkRequest)
        .where(
          and(
            eq(hrmFlexibleWorkRequest.organizationId, organizationId),
            eq(hrmFlexibleWorkRequest.state, "submitted")
          )
        ),
      db
        .select({ value: count() })
        .from(hrmFlexibleWorkRequest)
        .where(
          and(
            eq(hrmFlexibleWorkRequest.organizationId, organizationId),
            inArray(hrmFlexibleWorkRequest.state, ["active", "approved"])
          )
        ),
      db
        .select({ value: count() })
        .from(hrmFlexibleWorkArrangementType)
        .where(
          and(
            eq(hrmFlexibleWorkArrangementType.organizationId, organizationId),
            isNull(hrmFlexibleWorkArrangementType.archivedAt)
          )
        ),
      db
        .select({ value: count() })
        .from(hrmFlexibleWorkRequest)
        .where(
          and(
            eq(hrmFlexibleWorkRequest.organizationId, organizationId),
            inArray(hrmFlexibleWorkRequest.state, ["active", "approved"]),
            or(
              and(
                sql`${hrmFlexibleWorkRequest.endDate} IS NOT NULL`,
                lte(hrmFlexibleWorkRequest.endDate, within30),
                gte(hrmFlexibleWorkRequest.endDate, today)
              ),
              and(
                sql`${hrmFlexibleWorkRequest.reviewDate} IS NOT NULL`,
                lte(hrmFlexibleWorkRequest.reviewDate, within30),
                gte(hrmFlexibleWorkRequest.reviewDate, today)
              )
            )
          )
        ),
      countFwaComplianceGaps(organizationId),
    ])

  return {
    pendingCount: Number(pendingRow[0]?.value ?? 0),
    activeCount: Number(activeRow[0]?.value ?? 0),
    typesCount: Number(typesRow[0]?.value ?? 0),
    expiringWithin30DaysCount: Number(expiringRow[0]?.value ?? 0),
    complianceGapCount,
  }
}

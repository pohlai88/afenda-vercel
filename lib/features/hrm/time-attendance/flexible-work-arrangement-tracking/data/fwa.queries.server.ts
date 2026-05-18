import "server-only"

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm"

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

export type FwaEmployeeChoiceRow = {
  id: string
  employeeNumber: string | null
  legalName: string
}

export type FwaEmployeeContextRow = {
  id: string
  employeeNumber: string | null
  legalName: string
  managerEmployeeId: string | null
  archivedAt: Date | null
}

export type FwaArrangementTypeChoiceRow = {
  id: string
  code: string
  label: string
  arrangementKind: string
  requiresRemoteLocation: boolean
  requiresSupportingDocument: boolean
}

export type OrgFwaRequestRow = {
  id: string
  employeeId: string
  employeeNumber: string | null
  employeeFullName: string | null
  arrangementTypeId: string
  arrangementTypeCode: string
  arrangementTypeLabel: string
  arrangementKind: string
  requestedAt: Date
  reason: string | null
  startDate: string
  endDate: string | null
  remoteLocation: string | null
  state: HrmFwaRequestState
  currentApprovalId: string | null
  currentApproverUserId: string | null
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

export async function findFwaEmployeeForUser(
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
}

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

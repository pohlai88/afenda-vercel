import "server-only"

import { and, asc, desc, eq, gte, inArray, lte, or } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmShiftAssignment,
  hrmShiftSwapRequest,
} from "#lib/db/schema"

export type ShiftSwapRequestRow = {
  readonly id: string
  readonly organizationId: string
  readonly state: string
  readonly reason: string
  readonly rejectedReason: string | null
  readonly requesterEmployeeId: string
  readonly requesterAssignmentId: string
  readonly counterpartyEmployeeId: string
  readonly counterpartyAssignmentId: string
  readonly currentApprovalId: string | null
  readonly requesterName: string | null
  readonly requesterNumber: string | null
  readonly counterpartyName: string | null
  readonly requesterDate: string
  readonly counterpartyDate: string
  readonly requesterTemplateCode: string
  readonly counterpartyTemplateCode: string
  readonly createdAt: Date
}

export async function listPendingShiftSwapRequests(
  organizationId: string
): Promise<ShiftSwapRequestRow[]> {
  const rows = await db
    .select({
      id: hrmShiftSwapRequest.id,
      organizationId: hrmShiftSwapRequest.organizationId,
      state: hrmShiftSwapRequest.state,
      reason: hrmShiftSwapRequest.reason,
      rejectedReason: hrmShiftSwapRequest.rejectedReason,
      requesterEmployeeId: hrmShiftSwapRequest.requesterEmployeeId,
      requesterAssignmentId: hrmShiftSwapRequest.requesterAssignmentId,
      counterpartyEmployeeId: hrmShiftSwapRequest.counterpartyEmployeeId,
      counterpartyAssignmentId: hrmShiftSwapRequest.counterpartyAssignmentId,
      currentApprovalId: hrmShiftSwapRequest.currentApprovalId,
      requesterName: hrmEmployee.legalName,
      requesterNumber: hrmEmployee.employeeNumber,
      counterpartyName: hrmEmployee.legalName,
      requesterDate: hrmShiftAssignment.attendanceDate,
      requesterTemplateCode: hrmShiftAssignment.templateCode,
      createdAt: hrmShiftSwapRequest.createdAt,
    })
    .from(hrmShiftSwapRequest)
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmShiftSwapRequest.requesterEmployeeId)
    )
    .innerJoin(
      hrmShiftAssignment,
      eq(hrmShiftAssignment.id, hrmShiftSwapRequest.requesterAssignmentId)
    )
    .where(
      and(
        eq(hrmShiftSwapRequest.organizationId, organizationId),
        eq(hrmShiftSwapRequest.state, "submitted")
      )
    )
    .orderBy(desc(hrmShiftSwapRequest.createdAt))

  const counterpartyIds = [
    ...new Set(rows.map((row) => row.counterpartyAssignmentId)),
  ]

  const counterpartyRows =
    counterpartyIds.length > 0
      ? await db
          .select({
            id: hrmShiftAssignment.id,
            attendanceDate: hrmShiftAssignment.attendanceDate,
            templateCode: hrmShiftAssignment.templateCode,
          })
          .from(hrmShiftAssignment)
          .where(
            and(
              eq(hrmShiftAssignment.organizationId, organizationId),
              inArray(hrmShiftAssignment.id, counterpartyIds)
            )
          )
      : []

  const counterpartyById = new Map(counterpartyRows.map((row) => [row.id, row]))

  const counterpartyEmployeeIds = [
    ...new Set(rows.map((row) => row.counterpartyEmployeeId)),
  ]

  const counterpartyEmployees =
    counterpartyEmployeeIds.length > 0
      ? await db
          .select({
            id: hrmEmployee.id,
            legalName: hrmEmployee.legalName,
          })
          .from(hrmEmployee)
          .where(
            and(
              eq(hrmEmployee.organizationId, organizationId),
              inArray(hrmEmployee.id, counterpartyEmployeeIds)
            )
          )
      : []

  const counterpartyNameById = new Map(
    counterpartyEmployees.map((row) => [row.id, row.legalName])
  )

  return rows.map((row) => {
    const counterpartyAssignment = counterpartyById.get(
      row.counterpartyAssignmentId
    )
    return {
      id: row.id,
      organizationId: row.organizationId,
      state: row.state,
      reason: row.reason,
      rejectedReason: row.rejectedReason,
      requesterEmployeeId: row.requesterEmployeeId,
      requesterAssignmentId: row.requesterAssignmentId,
      counterpartyEmployeeId: row.counterpartyEmployeeId,
      counterpartyAssignmentId: row.counterpartyAssignmentId,
      currentApprovalId: row.currentApprovalId,
      requesterName: row.requesterName,
      requesterNumber: row.requesterNumber,
      counterpartyName:
        counterpartyNameById.get(row.counterpartyEmployeeId) ?? null,
      requesterDate: row.requesterDate,
      counterpartyDate: counterpartyAssignment?.attendanceDate ?? "—",
      requesterTemplateCode: row.requesterTemplateCode,
      counterpartyTemplateCode: counterpartyAssignment?.templateCode ?? "—",
      createdAt: row.createdAt,
    }
  })
}

export type EmployeeShiftSwapRow = {
  readonly id: string
  readonly state: string
  readonly reason: string
  readonly rejectedReason: string | null
  readonly requesterDate: string
  readonly counterpartyDate: string
  readonly requesterTemplateCode: string
  readonly counterpartyTemplateCode: string
  readonly createdAt: Date
  readonly isRequester: boolean
}

export async function listShiftSwapRequestsForEmployee(input: {
  organizationId: string
  employeeId: string
}): Promise<EmployeeShiftSwapRow[]> {
  const rows = await db
    .select({
      id: hrmShiftSwapRequest.id,
      state: hrmShiftSwapRequest.state,
      reason: hrmShiftSwapRequest.reason,
      rejectedReason: hrmShiftSwapRequest.rejectedReason,
      requesterEmployeeId: hrmShiftSwapRequest.requesterEmployeeId,
      requesterAssignmentId: hrmShiftSwapRequest.requesterAssignmentId,
      counterpartyAssignmentId: hrmShiftSwapRequest.counterpartyAssignmentId,
      createdAt: hrmShiftSwapRequest.createdAt,
      requesterDate: hrmShiftAssignment.attendanceDate,
      requesterTemplateCode: hrmShiftAssignment.templateCode,
    })
    .from(hrmShiftSwapRequest)
    .innerJoin(
      hrmShiftAssignment,
      eq(hrmShiftAssignment.id, hrmShiftSwapRequest.requesterAssignmentId)
    )
    .where(
      and(
        eq(hrmShiftSwapRequest.organizationId, input.organizationId),
        or(
          eq(hrmShiftSwapRequest.requesterEmployeeId, input.employeeId),
          eq(hrmShiftSwapRequest.counterpartyEmployeeId, input.employeeId)
        )
      )
    )
    .orderBy(desc(hrmShiftSwapRequest.createdAt))
    .limit(50)

  const counterpartyIds = [
    ...new Set(rows.map((row) => row.counterpartyAssignmentId)),
  ]

  const counterpartyAssignments =
    counterpartyIds.length > 0
      ? await db
          .select({
            id: hrmShiftAssignment.id,
            attendanceDate: hrmShiftAssignment.attendanceDate,
            templateCode: hrmShiftAssignment.templateCode,
          })
          .from(hrmShiftAssignment)
          .where(
            and(
              eq(hrmShiftAssignment.organizationId, input.organizationId),
              inArray(hrmShiftAssignment.id, counterpartyIds)
            )
          )
      : []

  const counterpartyById = new Map(
    counterpartyAssignments.map((row) => [row.id, row])
  )

  return rows.map((row) => {
    const counterparty = counterpartyById.get(row.counterpartyAssignmentId)
    return {
      id: row.id,
      state: row.state,
      reason: row.reason,
      rejectedReason: row.rejectedReason,
      requesterDate: row.requesterDate,
      counterpartyDate: counterparty?.attendanceDate ?? "—",
      requesterTemplateCode: row.requesterTemplateCode,
      counterpartyTemplateCode: counterparty?.templateCode ?? "—",
      createdAt: row.createdAt,
      isRequester: row.requesterEmployeeId === input.employeeId,
    }
  })
}

export type SwapAssignmentChoice = {
  readonly id: string
  readonly label: string
}

export async function listSwapAssignmentChoicesForEmployee(input: {
  organizationId: string
  employeeId: string
  rangeStart: string
  rangeEnd: string
}): Promise<{
  requester: SwapAssignmentChoice[]
  counterparty: SwapAssignmentChoice[]
}> {
  const rows = await db
    .select({
      id: hrmShiftAssignment.id,
      employeeId: hrmShiftAssignment.employeeId,
      attendanceDate: hrmShiftAssignment.attendanceDate,
      templateCode: hrmShiftAssignment.templateCode,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
    })
    .from(hrmShiftAssignment)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmShiftAssignment.employeeId))
    .where(
      and(
        eq(hrmShiftAssignment.organizationId, input.organizationId),
        gte(hrmShiftAssignment.attendanceDate, input.rangeStart),
        lte(hrmShiftAssignment.attendanceDate, input.rangeEnd)
      )
    )
    .orderBy(asc(hrmShiftAssignment.attendanceDate))

  const requester: SwapAssignmentChoice[] = []
  const counterparty: SwapAssignmentChoice[] = []

  for (const row of rows) {
    const name = row.legalName
      ? row.employeeNumber
        ? `${row.legalName} · ${row.employeeNumber}`
        : row.legalName
      : row.employeeId
    const label = `${row.attendanceDate} · ${row.templateCode} · ${name}`
    const choice = { id: row.id, label }
    if (row.employeeId === input.employeeId) {
      requester.push(choice)
    } else {
      counterparty.push(choice)
    }
  }

  return { requester, counterparty }
}

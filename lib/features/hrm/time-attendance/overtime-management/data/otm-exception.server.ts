import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmOvertimeException,
  hrmOvertimeRequest,
} from "#lib/db/schema"

import type {
  HrmOtmExceptionState,
  HrmOtmExceptionType,
} from "../schemas/otm-workflow-state.shared"
import {
  detectOtmPolicyExceptions,
  type OtmDetectedException,
} from "./otm-exception-detect.server"
import type { HrmOtmTimingKind } from "../schemas/otm-workflow-state.shared"

export type OtmExceptionInboxRow = {
  id: string
  requestId: string
  exceptionType: HrmOtmExceptionType
  state: HrmOtmExceptionState
  justification: string | null
  employeeId: string
  employeeNumber: string | null
  employeeFullName: string | null
  workDate: string
  startTime: string
  endTime: string
  durationMinutes: number
}

export async function syncOtmExceptionsOnSubmit(input: {
  organizationId: string
  requestId: string
  employeeId: string
  workDate: string
  durationMinutes: number
  timingKind: HrmOtmTimingKind
}): Promise<void> {
  const detected = await detectOtmPolicyExceptions({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    workDate: input.workDate,
    durationMinutes: input.durationMinutes,
    timingKind: input.timingKind,
    excludeRequestId: input.requestId,
  })

  if (detected.length === 0) return

  const byType = dedupeExceptionsByType(detected)

  await db.insert(hrmOvertimeException).values(
    byType.map((ex) => ({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      requestId: input.requestId,
      exceptionType: ex.type,
      state: "pending" as const,
      justification: ex.message,
    }))
  )
}

function dedupeExceptionsByType(
  detected: readonly OtmDetectedException[]
): OtmDetectedException[] {
  const seen = new Set<HrmOtmExceptionType>()
  const out: OtmDetectedException[] = []
  for (const ex of detected) {
    if (seen.has(ex.type)) continue
    seen.add(ex.type)
    out.push(ex)
  }
  return out
}

export async function countPendingOtmExceptionsForRequest(
  organizationId: string,
  requestId: string
): Promise<number> {
  const rows = await db.query.hrmOvertimeException.findMany({
    where: and(
      eq(hrmOvertimeException.organizationId, organizationId),
      eq(hrmOvertimeException.requestId, requestId),
      eq(hrmOvertimeException.state, "pending")
    ),
    columns: { id: true },
  })
  return rows.length
}

export async function listPendingOtmExceptionsForOrg(
  organizationId: string,
  limit = 50
): Promise<OtmExceptionInboxRow[]> {
  const exceptions = await db.query.hrmOvertimeException.findMany({
    where: and(
      eq(hrmOvertimeException.organizationId, organizationId),
      eq(hrmOvertimeException.state, "pending")
    ),
    columns: {
      id: true,
      requestId: true,
      exceptionType: true,
      state: true,
      justification: true,
    },
    orderBy: [desc(hrmOvertimeException.createdAt)],
    limit: Math.min(Math.max(limit, 1), 200),
  })

  if (exceptions.length === 0) return []

  const requestIds = [...new Set(exceptions.map((row) => row.requestId))]
  const requests = await db.query.hrmOvertimeRequest.findMany({
    where: and(
      eq(hrmOvertimeRequest.organizationId, organizationId),
      inArray(hrmOvertimeRequest.id, requestIds)
    ),
    columns: {
      id: true,
      employeeId: true,
      workDate: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
    },
  })
  const requestMap = new Map(requests.map((row) => [row.id, row]))
  const employeeIds = [...new Set(requests.map((row) => row.employeeId))]

  const employees = await db.query.hrmEmployee.findMany({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      inArray(hrmEmployee.id, employeeIds)
    ),
    columns: { id: true, employeeNumber: true, legalName: true },
  })
  const employeeMap = new Map(
    employees.map((employee) => [
      employee.id,
      { number: employee.employeeNumber, name: employee.legalName },
    ])
  )

  const rows: OtmExceptionInboxRow[] = []
  for (const ex of exceptions) {
    const request = requestMap.get(ex.requestId)
    if (!request) continue
    const employee = employeeMap.get(request.employeeId)
    rows.push({
      id: ex.id,
      requestId: ex.requestId,
      exceptionType: ex.exceptionType as HrmOtmExceptionType,
      state: ex.state as HrmOtmExceptionState,
      justification: ex.justification,
      employeeId: request.employeeId,
      employeeNumber: employee?.number ?? null,
      employeeFullName: employee?.name ?? null,
      workDate: request.workDate,
      startTime: request.startTime,
      endTime: request.endTime,
      durationMinutes: request.durationMinutes,
    })
  }

  return rows
}

export async function decideOtmException(input: {
  organizationId: string
  exceptionId: string
  userId: string
  decision: "approved" | "rejected"
  decisionNote?: string | null
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const row = await db.query.hrmOvertimeException.findFirst({
    where: and(
      eq(hrmOvertimeException.id, input.exceptionId),
      eq(hrmOvertimeException.organizationId, input.organizationId)
    ),
    columns: { id: true, state: true, requestId: true },
  })

  if (!row) {
    return { ok: false, reason: "Exception not found." }
  }
  if (row.state !== "pending") {
    return { ok: false, reason: `Exception is already ${row.state}.` }
  }

  const now = new Date()
  await db
    .update(hrmOvertimeException)
    .set({
      state: input.decision,
      justification: input.decisionNote?.trim() || null,
      decidedByUserId: input.userId,
      decidedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmOvertimeException.id, input.exceptionId),
        eq(hrmOvertimeException.organizationId, input.organizationId)
      )
    )

  return { ok: true }
}

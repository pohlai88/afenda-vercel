import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmShiftRecurrenceRule,
  hrmShiftRotationCycle,
  hrmShiftRotationStep,
} from "#lib/db/schema"

import {
  buildAttendanceShiftPolicySnapshot,
  buildScheduledShiftWindow,
} from "./sft-shift.shared"
import { upsertShiftAssignmentUnlessLocked } from "./sft-assignment-commands.server"
import { getActiveShiftTemplateForOrg } from "./sft-template.queries.server"
import { addDaysIso } from "./sft-conflict-detect.shared"

function eachDateInRange(rangeStart: string, rangeEnd: string): string[] {
  const dates: string[] = []
  let cursor = rangeStart
  while (cursor <= rangeEnd) {
    dates.push(cursor)
    cursor = addDaysIso(cursor, 1)
  }
  return dates
}

export async function applyRecurrenceRule(input: {
  organizationId: string
  ruleId: string
  rangeStart: string
  rangeEnd: string
  actorUserId: string
}): Promise<{ applied: number; skipped: number }> {
  const ruleRows = await db
    .select()
    .from(hrmShiftRecurrenceRule)
    .where(
      and(
        eq(hrmShiftRecurrenceRule.organizationId, input.organizationId),
        eq(hrmShiftRecurrenceRule.id, input.ruleId),
        eq(hrmShiftRecurrenceRule.isActive, true)
      )
    )
    .limit(1)
  const rule = ruleRows[0]

  if (!rule) {
    return { applied: 0, skipped: 0 }
  }

  const template = await getActiveShiftTemplateForOrg({
    organizationId: input.organizationId,
    shiftTemplateId: rule.shiftTemplateId,
  })
  if (!template) {
    return { applied: 0, skipped: 0 }
  }

  const effectiveStart =
    input.rangeStart > rule.startDate ? input.rangeStart : rule.startDate
  const effectiveEnd = rule.endDate
    ? input.rangeEnd < rule.endDate
      ? input.rangeEnd
      : rule.endDate
    : input.rangeEnd

  if (effectiveStart > effectiveEnd) {
    return { applied: 0, skipped: 0 }
  }

  const policySnapshot = buildAttendanceShiftPolicySnapshot(template)
  const now = new Date()
  let applied = 0
  let skipped = 0

  for (const attendanceDate of eachDateInRange(effectiveStart, effectiveEnd)) {
    const weekday = new Date(`${attendanceDate}T12:00:00.000Z`).getUTCDay()
    if (weekday !== rule.weekday) continue

    const { scheduledStartAt, scheduledEndAt } = buildScheduledShiftWindow({
      attendanceDate,
      defaultStartTime: template.defaultStartTime,
      defaultEndTime: template.defaultEndTime,
    })

    const assignmentId = await upsertShiftAssignmentUnlessLocked({
      organizationId: input.organizationId,
      employeeId: rule.employeeId,
      attendanceDate,
      template,
      scheduledStartAt,
      scheduledEndAt,
      policySnapshot,
      assignmentId: crypto.randomUUID(),
      actorUserId: input.actorUserId,
      now,
      guardRangeStart: attendanceDate,
      guardRangeEnd: attendanceDate,
    })

    if (assignmentId) applied += 1
    else skipped += 1
  }

  return { applied, skipped }
}

export async function applyRotationCycle(input: {
  organizationId: string
  rotationCycleId: string
  employeeId: string
  rangeStart: string
  rangeEnd: string
  actorUserId: string
}): Promise<{ applied: number; skipped: number }> {
  const [cycleRows, steps] = await Promise.all([
    db
      .select()
      .from(hrmShiftRotationCycle)
      .where(
        and(
          eq(hrmShiftRotationCycle.organizationId, input.organizationId),
          eq(hrmShiftRotationCycle.id, input.rotationCycleId),
          eq(hrmShiftRotationCycle.isActive, true)
        )
      )
      .limit(1),
    db
      .select({
        stepIndex: hrmShiftRotationStep.stepIndex,
        shiftTemplateId: hrmShiftRotationStep.shiftTemplateId,
      })
      .from(hrmShiftRotationStep)
      .where(
        and(
          eq(hrmShiftRotationStep.organizationId, input.organizationId),
          eq(hrmShiftRotationStep.rotationCycleId, input.rotationCycleId)
        )
      )
      .orderBy(asc(hrmShiftRotationStep.stepIndex)),
  ])

  const cycle = cycleRows[0]
  if (!cycle || steps.length === 0) {
    return { applied: 0, skipped: 0 }
  }

  const now = new Date()
  let applied = 0
  let skipped = 0
  let dayIndex = 0

  for (const attendanceDate of eachDateInRange(
    input.rangeStart,
    input.rangeEnd
  )) {
    const step = steps[dayIndex % steps.length]
    dayIndex += 1

    const template = await getActiveShiftTemplateForOrg({
      organizationId: input.organizationId,
      shiftTemplateId: step.shiftTemplateId,
    })
    if (!template) {
      skipped += 1
      continue
    }

    const { scheduledStartAt, scheduledEndAt } = buildScheduledShiftWindow({
      attendanceDate,
      defaultStartTime: template.defaultStartTime,
      defaultEndTime: template.defaultEndTime,
    })

    const assignmentId = await upsertShiftAssignmentUnlessLocked({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      attendanceDate,
      template,
      scheduledStartAt,
      scheduledEndAt,
      policySnapshot: buildAttendanceShiftPolicySnapshot(template),
      assignmentId: crypto.randomUUID(),
      actorUserId: input.actorUserId,
      now,
      guardRangeStart: attendanceDate,
      guardRangeEnd: attendanceDate,
    })

    if (assignmentId) applied += 1
    else skipped += 1
  }

  return { applied, skipped }
}

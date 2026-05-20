import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmShiftRecurrenceRule,
  hrmShiftRotationCycle,
  hrmShiftTemplate,
} from "#lib/db/schema"

export type SftRecurrenceRuleRow = {
  readonly id: string
  readonly employeeId: string
  readonly employeeName: string
  readonly employeeNumber: string | null
  readonly shiftTemplateId: string
  readonly templateCode: string
  readonly templateName: string
  readonly startDate: string
  readonly endDate: string | null
  readonly weekday: number
}

export type SftRotationCycleRow = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly cycleLengthDays: number
}

export async function listRecurrenceRulesForOrg(
  organizationId: string
): Promise<SftRecurrenceRuleRow[]> {
  const rows = await db
    .select({
      id: hrmShiftRecurrenceRule.id,
      employeeId: hrmShiftRecurrenceRule.employeeId,
      employeeName: hrmEmployee.legalName,
      employeeNumber: hrmEmployee.employeeNumber,
      shiftTemplateId: hrmShiftRecurrenceRule.shiftTemplateId,
      templateCode: hrmShiftTemplate.code,
      templateName: hrmShiftTemplate.name,
      startDate: hrmShiftRecurrenceRule.startDate,
      endDate: hrmShiftRecurrenceRule.endDate,
      weekday: hrmShiftRecurrenceRule.weekday,
    })
    .from(hrmShiftRecurrenceRule)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmShiftRecurrenceRule.employeeId),
        eq(hrmEmployee.organizationId, hrmShiftRecurrenceRule.organizationId)
      )
    )
    .innerJoin(
      hrmShiftTemplate,
      eq(hrmShiftTemplate.id, hrmShiftRecurrenceRule.shiftTemplateId)
    )
    .where(
      and(
        eq(hrmShiftRecurrenceRule.organizationId, organizationId),
        eq(hrmShiftRecurrenceRule.isActive, true)
      )
    )
    .orderBy(asc(hrmEmployee.legalName))

  return rows
}

export async function listRotationCyclesForOrg(
  organizationId: string
): Promise<SftRotationCycleRow[]> {
  const rows = await db
    .select({
      id: hrmShiftRotationCycle.id,
      code: hrmShiftRotationCycle.code,
      name: hrmShiftRotationCycle.name,
      cycleLengthDays: hrmShiftRotationCycle.cycleLengthDays,
    })
    .from(hrmShiftRotationCycle)
    .where(
      and(
        eq(hrmShiftRotationCycle.organizationId, organizationId),
        eq(hrmShiftRotationCycle.isActive, true)
      )
    )
    .orderBy(asc(hrmShiftRotationCycle.code))

  return rows
}

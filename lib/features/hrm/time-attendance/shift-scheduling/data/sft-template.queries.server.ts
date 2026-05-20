import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmShiftTemplate } from "#lib/db/schema"

import {
  isSftPatternKind,
  isSftShiftCategory,
  normalizeShiftHolidayBehavior,
  type ShiftHolidayBehavior,
  type SftPatternKind,
  type SftShiftCategory,
} from "./sft-shift.shared"

export type ShiftTemplateRow = {
  readonly id: string
  readonly organizationId: string
  readonly code: string
  readonly name: string
  readonly defaultStartTime: string
  readonly defaultEndTime: string
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
  readonly holidayBehavior: ShiftHolidayBehavior
  readonly shiftCategory: SftShiftCategory
  readonly patternKind: SftPatternKind
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

function normalizeTemplateRow(row: {
  readonly id: string
  readonly organizationId: string
  readonly code: string
  readonly name: string
  readonly defaultStartTime: string
  readonly defaultEndTime: string
  readonly unpaidBreakMinutes: number
  readonly paidBreakMinutes: number
  readonly lateGraceMinutes: number
  readonly earlyOutGraceMinutes: number
  readonly overtimeGraceMinutes: number
  readonly maxContinuousClockMinutes: number
  readonly holidayBehavior: string
  readonly shiftCategory: string
  readonly patternKind: string
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}): ShiftTemplateRow {
  const shiftCategory = isSftShiftCategory(row.shiftCategory)
    ? row.shiftCategory
    : "general"
  const patternKind = isSftPatternKind(row.patternKind)
    ? row.patternKind
    : "fixed"

  return {
    ...row,
    holidayBehavior: normalizeShiftHolidayBehavior(row.holidayBehavior),
    shiftCategory,
    patternKind,
  }
}

const templateSelect = {
  id: hrmShiftTemplate.id,
  organizationId: hrmShiftTemplate.organizationId,
  code: hrmShiftTemplate.code,
  name: hrmShiftTemplate.name,
  defaultStartTime: hrmShiftTemplate.defaultStartTime,
  defaultEndTime: hrmShiftTemplate.defaultEndTime,
  unpaidBreakMinutes: hrmShiftTemplate.unpaidBreakMinutes,
  paidBreakMinutes: hrmShiftTemplate.paidBreakMinutes,
  lateGraceMinutes: hrmShiftTemplate.lateGraceMinutes,
  earlyOutGraceMinutes: hrmShiftTemplate.earlyOutGraceMinutes,
  overtimeGraceMinutes: hrmShiftTemplate.overtimeGraceMinutes,
  maxContinuousClockMinutes: hrmShiftTemplate.maxContinuousClockMinutes,
  holidayBehavior: hrmShiftTemplate.holidayBehavior,
  shiftCategory: hrmShiftTemplate.shiftCategory,
  patternKind: hrmShiftTemplate.patternKind,
  isActive: hrmShiftTemplate.isActive,
  createdAt: hrmShiftTemplate.createdAt,
  updatedAt: hrmShiftTemplate.updatedAt,
}

export async function listShiftTemplatesForOrg(
  organizationId: string
): Promise<ShiftTemplateRow[]> {
  const rows = await db
    .select(templateSelect)
    .from(hrmShiftTemplate)
    .where(
      and(
        eq(hrmShiftTemplate.organizationId, organizationId),
        eq(hrmShiftTemplate.isActive, true)
      )
    )
    .orderBy(asc(hrmShiftTemplate.code))

  return rows.map(normalizeTemplateRow)
}

export async function listAllShiftTemplatesForOrg(
  organizationId: string
): Promise<ShiftTemplateRow[]> {
  const rows = await db
    .select(templateSelect)
    .from(hrmShiftTemplate)
    .where(eq(hrmShiftTemplate.organizationId, organizationId))
    .orderBy(asc(hrmShiftTemplate.code))

  return rows.map(normalizeTemplateRow)
}

export async function getActiveShiftTemplateForOrg(opts: {
  organizationId: string
  shiftTemplateId: string
}): Promise<ShiftTemplateRow | null> {
  const rows = await db
    .select(templateSelect)
    .from(hrmShiftTemplate)
    .where(
      and(
        eq(hrmShiftTemplate.organizationId, opts.organizationId),
        eq(hrmShiftTemplate.id, opts.shiftTemplateId),
        eq(hrmShiftTemplate.isActive, true)
      )
    )
    .limit(1)

  return rows[0] ? normalizeTemplateRow(rows[0]) : null
}

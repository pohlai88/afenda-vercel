import type {
  AttendanceShiftTemplateOption,
  AttendanceShiftTemplatePolicy,
} from "./sft-shift.shared"
import type { ShiftTemplateRow } from "./sft-template.queries.server"

export function shiftTemplateRowToOption(
  row: ShiftTemplateRow
): AttendanceShiftTemplateOption {
  return shiftTemplateRowToPolicy(row)
}

export function shiftTemplateRowToPolicy(
  row: ShiftTemplateRow
): AttendanceShiftTemplatePolicy {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    defaultStartTime: row.defaultStartTime,
    defaultEndTime: row.defaultEndTime,
    unpaidBreakMinutes: row.unpaidBreakMinutes,
    paidBreakMinutes: row.paidBreakMinutes,
    lateGraceMinutes: row.lateGraceMinutes,
    earlyOutGraceMinutes: row.earlyOutGraceMinutes,
    overtimeGraceMinutes: row.overtimeGraceMinutes,
    maxContinuousClockMinutes: row.maxContinuousClockMinutes,
    holidayBehavior: row.holidayBehavior,
  }
}

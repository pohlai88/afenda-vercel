import { z } from "zod"

import {
  normalizeShiftCode,
  SHIFT_HOLIDAY_BEHAVIORS,
} from "../data/attendance-shift.shared"

/** ISO datetime string accepted by the attendance forms (e.g. "2026-05-11T09:00:00"). */
const isoDatetimeSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .refine(
    (v) => !Number.isNaN(new Date(v).getTime()),
    "Must be a valid ISO datetime"
  )

/** ISO date string (YYYY-MM-DD). */
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")

export const ATTENDANCE_EVENT_TYPES = [
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
] as const

const ATTENDANCE_SOURCES = ["manual", "csv_import"] as const

const shiftClockTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be HH:mm")

const wholeMinutesSchema = z.coerce
  .number()
  .int("Must be a whole number")
  .min(0, "Must be zero or greater")

const positiveMinutesSchema = z.coerce
  .number()
  .int("Must be a whole number")
  .min(1, "Must be greater than zero")

// ---------------------------------------------------------------------------
// recordAttendanceEventAction form schema
// ---------------------------------------------------------------------------

export const recordAttendanceEventSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee is required"),
  eventType: z.enum(ATTENDANCE_EVENT_TYPES),
  occurredAt: isoDatetimeSchema,
  /** Defaults to "manual" for form submissions. */
  source: z.enum(ATTENDANCE_SOURCES).default("manual"),
  deviceId: z.string().trim().optional(),
})

export type RecordAttendanceEventInput = z.infer<
  typeof recordAttendanceEventSchema
>

// ---------------------------------------------------------------------------
// correctAttendanceEventAction form schema
// ---------------------------------------------------------------------------

export const correctAttendanceEventSchema = z.object({
  /** The event being corrected (must belong to org). */
  originalEventId: z.string().trim().min(1, "Original event ID is required"),
  /** Replacement eventType for the correction event. */
  eventType: z.enum(ATTENDANCE_EVENT_TYPES),
  /** Corrected timestamp. */
  occurredAt: isoDatetimeSchema,
  correctionReason: z
    .string()
    .trim()
    .min(3, "Correction reason is required (minimum 3 characters)")
    .max(500),
})

export type CorrectAttendanceEventInput = z.infer<
  typeof correctAttendanceEventSchema
>

// ---------------------------------------------------------------------------
// regenerateAttendanceDayAction form schema
// ---------------------------------------------------------------------------

export const regenerateAttendanceDaySchema = z.object({
  employeeId: z.string().trim().min(1, "Employee is required"),
  attendanceDate: isoDateSchema,
})

export type RegenerateAttendanceDayInput = z.infer<
  typeof regenerateAttendanceDaySchema
>

// ---------------------------------------------------------------------------
// Shift templates + explicit assignments
// ---------------------------------------------------------------------------

export const createShiftTemplateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Code is required")
      .max(24, "Code must be 24 characters or less")
      .transform(normalizeShiftCode)
      .refine((value) => /^[A-Z0-9_]+$/.test(value), {
        message: "Use letters, numbers, and underscores only",
      }),
    name: z.string().trim().min(1, "Name is required").max(120),
    defaultStartTime: shiftClockTimeSchema,
    defaultEndTime: shiftClockTimeSchema,
    unpaidBreakMinutes: wholeMinutesSchema.default(0),
    paidBreakMinutes: wholeMinutesSchema.default(0),
    lateGraceMinutes: wholeMinutesSchema.default(0),
    earlyOutGraceMinutes: wholeMinutesSchema.default(0),
    overtimeGraceMinutes: wholeMinutesSchema.default(0),
    maxContinuousClockMinutes: positiveMinutesSchema.default(960),
    holidayBehavior: z.enum(SHIFT_HOLIDAY_BEHAVIORS).default("scheduled"),
  })
  .refine((value) => value.defaultStartTime !== value.defaultEndTime, {
    message: "Start and end cannot be the same time",
    path: ["defaultEndTime"],
  })

export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>

export const assignEmployeeShiftSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee is required"),
  attendanceDate: isoDateSchema,
  shiftTemplateId: z.string().trim().min(1, "Shift template is required"),
})

export type AssignEmployeeShiftInput = z.infer<typeof assignEmployeeShiftSchema>

// ---------------------------------------------------------------------------
// CSV import row schema (used by the attendance-import adapter)
// ---------------------------------------------------------------------------

/**
 * Single row parsed from an attendance CSV.
 * Required headers: employee_id, event_type, occurred_at.
 * Optional: correction_of_event_id, correction_reason, device_id.
 */
export const attendanceCsvRowSchema = z
  .object({
    employee_id: z.string().trim().min(1, "employee_id required"),
    event_type: z.enum(ATTENDANCE_EVENT_TYPES),
    occurred_at: isoDatetimeSchema,
    correction_of_event_id: z.string().trim().optional(),
    correction_reason: z.string().trim().optional(),
    device_id: z.string().trim().optional(),
  })
  .refine(
    (v) =>
      !v.correction_of_event_id ||
      (v.correction_reason && v.correction_reason.length >= 3),
    {
      message:
        "correction_reason is required when correction_of_event_id is set",
      path: ["correction_reason"],
    }
  )

export type AttendanceCsvRow = z.infer<typeof attendanceCsvRowSchema>

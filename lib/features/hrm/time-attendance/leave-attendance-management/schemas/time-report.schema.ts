import { z } from "zod"

import { HRM_TIME_REPORT_OVERTIME_RETIRED_MESSAGE } from "../data/time-report-policy.shared"

/**
 * `hrm_approval.subjectKind` for business-trip time reports.
 * Legacy `reportKind: overtime` rows remain in DB for read-only history; new OT uses OTM.
 */
export const HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND = "time_report" as const

/** Stored on `hrm_time_report.reportKind` (includes legacy overtime). */
export const hrmTimeReportKindSchema = z.enum(["overtime", "business_trip"])
export type HrmTimeReportKind = z.infer<typeof hrmTimeReportKindSchema>

/** Submittable report kinds — overtime is retired (see ARCHITECTURE.md). */
export const submitTimeReportKindSchema = z.enum(["business_trip"])
export type SubmitTimeReportKind = z.infer<typeof submitTimeReportKindSchema>

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")

const legacyOvertimeReportKindSchema = z.literal("overtime")

export const submitTimeReportFormSchema = z
  .object({
    employeeId: z.string().uuid("Employee ID must be a valid UUID"),
    reportKind: z.union([
      submitTimeReportKindSchema,
      legacyOvertimeReportKindSchema,
    ]),
    workDate: isoDate.optional().nullable(),
    overtimeMinutes: z.coerce.number().int().optional().nullable(),
    tripStartDate: isoDate.optional().nullable(),
    tripEndDate: isoDate.optional().nullable(),
    destination: z.string().max(500).nullable().optional(),
    reason: z.string().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reportKind === "overtime") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reportKind"],
        message: HRM_TIME_REPORT_OVERTIME_RETIRED_MESSAGE,
      })
      return
    }

    if (!data.tripStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tripStartDate"],
        message: "Trip start date is required",
      })
    }
    if (!data.tripEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tripEndDate"],
        message: "Trip end date is required",
      })
    }
    if (
      data.tripStartDate &&
      data.tripEndDate &&
      data.tripStartDate > data.tripEndDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tripEndDate"],
        message: "Trip end must be on or after trip start",
      })
    }
  })

export type SubmitTimeReportFormValues = z.infer<
  typeof submitTimeReportFormSchema
>

export const cancelTimeReportFormSchema = z.object({
  reportId: z.string().uuid("Report ID must be a valid UUID"),
})

export const timeReportApprovalDecisionSchema = z.object({
  reportId: z.string().uuid("Report ID must be a valid UUID"),
  decisionNote: z
    .string()
    .max(1000, "Note must be at most 1000 characters")
    .nullable()
    .default(null),
})

export const timeReportRejectDecisionSchema =
  timeReportApprovalDecisionSchema.extend({
    rejectedReason: z
      .string()
      .min(1, "Rejection reason is required")
      .max(1000, "Reason must be at most 1000 characters"),
  })

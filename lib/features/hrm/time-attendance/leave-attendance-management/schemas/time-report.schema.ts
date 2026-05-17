import { z } from "zod"

/**
 * `hrm_approval.subjectKind` for overtime / business-trip reports.
 * Discriminates the approval row; `hrm_time_report.reportKind` holds OT vs trip.
 */
export const HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND = "time_report" as const

export const hrmTimeReportKindSchema = z.enum(["overtime", "business_trip"])
export type HrmTimeReportKind = z.infer<typeof hrmTimeReportKindSchema>

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")

export const submitTimeReportFormSchema = z
  .object({
    employeeId: z.string().uuid("Employee ID must be a valid UUID"),
    reportKind: hrmTimeReportKindSchema,
    workDate: isoDate.optional().nullable(),
    overtimeMinutes: z.coerce.number().int().optional().nullable(),
    tripStartDate: isoDate.optional().nullable(),
    tripEndDate: isoDate.optional().nullable(),
    destination: z.string().max(500).nullable().optional(),
    reason: z.string().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reportKind === "overtime") {
      if (!data.workDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["workDate"],
          message: "Work date is required for overtime reports",
        })
      }
      const mins = data.overtimeMinutes
      if (mins == null || mins < 1 || mins > 24 * 60 * 31) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overtimeMinutes"],
          message: "Overtime minutes must be between 1 and 44640",
        })
      }
    } else {
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

import { z } from "zod"

export const orgHolidayFormSchema = z.object({
  holidayDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  name: z.string().min(1, "Name is required").max(200),
  regionCode: z.string().max(32).nullable().default(null),
})

export type OrgHolidayFormValues = z.infer<typeof orgHolidayFormSchema>

export const leaveBlackoutFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
    leaveTypeId: z.string().uuid().nullable().default(null),
  })
  .superRefine((val, ctx) => {
    if (val.startDate > val.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after start date",
      })
    }
  })

export type LeaveBlackoutFormValues = z.infer<typeof leaveBlackoutFormSchema>

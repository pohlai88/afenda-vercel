import { z } from "zod"

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const createKpiPeriodFormSchema = z
  .object({
    orgSlug: z.string().min(1),
    name: z.string().min(1).max(200),
    periodStart: isoDate,
    periodEnd: isoDate,
  })
  .superRefine((v, ctx) => {
    if (v.periodEnd < v.periodStart) {
      ctx.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Period end must be on or after period start.",
      })
    }
  })

export const upsertKpiScoreFormSchema = z.object({
  orgSlug: z.string().min(1),
  periodId: uuid,
  employeeId: uuid,
  metricCode: z.string().min(1).max(64),
  targetValue: z.string().max(64).optional(),
  achievedValue: z.string().max(64).optional(),
  notes: z.string().max(2000).optional(),
})

export type CreateKpiPeriodFormInput = z.infer<typeof createKpiPeriodFormSchema>
export type UpsertKpiScoreFormInput = z.infer<typeof upsertKpiScoreFormSchema>

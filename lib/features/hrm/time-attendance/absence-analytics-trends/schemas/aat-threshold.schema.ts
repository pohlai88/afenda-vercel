import { z } from "zod"

export const aatThresholdConfigSchema = z
  .object({
    watchAbsenceRate: z.number().finite().min(0).max(1),
    atRiskAbsenceRate: z.number().finite().min(0).max(1),
    highRiskAbsenceRate: z.number().finite().min(0).max(1),
    criticalAbsenceRate: z.number().finite().min(0).max(1),
    watchFrequency: z.number().int().min(0),
    atRiskFrequency: z.number().int().min(0),
    highRiskFrequency: z.number().int().min(0),
  })
  .strict()

export type AatThresholdConfig = z.infer<typeof aatThresholdConfigSchema>

export const AAT_DEFAULT_THRESHOLD_CONFIG = {
  watchAbsenceRate: 0.08,
  atRiskAbsenceRate: 0.12,
  highRiskAbsenceRate: 0.18,
  criticalAbsenceRate: 0.25,
  watchFrequency: 3,
  atRiskFrequency: 5,
  highRiskFrequency: 8,
} as const satisfies AatThresholdConfig

import { z } from "zod"

export const aatPeriodKeySchema = z.enum(["30d", "90d", "month", "quarter"])
export type AatPeriodKey = z.infer<typeof aatPeriodKeySchema>

export const aatScopeKeySchema = z.enum(["org", "team"])
export type AatScopeKey = z.infer<typeof aatScopeKeySchema>

export const aatRiskTierSchema = z.enum([
  "normal",
  "watch",
  "at_risk",
  "high_risk",
  "critical",
])
export type AatRiskTier = z.infer<typeof aatRiskTierSchema>

export const aatTrendDirectionSchema = z.enum([
  "improving",
  "stable",
  "worsening",
])
export type AatTrendDirection = z.infer<typeof aatTrendDirectionSchema>

export function parseAatPeriodKey(raw: string | undefined): AatPeriodKey {
  const parsed = aatPeriodKeySchema.safeParse(raw)
  return parsed.success ? parsed.data : "30d"
}

export function parseAatScopeKey(raw: string | undefined): AatScopeKey {
  const parsed = aatScopeKeySchema.safeParse(raw)
  return parsed.success ? parsed.data : "org"
}

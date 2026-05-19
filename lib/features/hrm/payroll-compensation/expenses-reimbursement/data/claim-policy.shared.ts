import { applyClaimAmountLimit } from "./claim-helpers.shared"

export type ClaimPolicyRules = {
  readonly dailyLimit?: number | null
  readonly perClaimLimit?: number | null
  readonly periodLimit?: number | null
  readonly annualLimit?: number | null
  readonly lateSubmissionDays?: number | null
  readonly requiresExceptionWhenOverLimit?: boolean
}

export type ClaimValidationFlag = {
  readonly flag: string
  readonly severity: "info" | "warning" | "error"
  readonly message: string
  readonly requiresException: boolean
}

export function parseClaimPolicyRules(value: unknown): ClaimPolicyRules | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const readNumber = (
    key: keyof ClaimPolicyRules
  ): number | null | undefined => {
    const candidate = record[key]
    if (candidate == null) return null
    const parsed = typeof candidate === "number" ? candidate : Number(candidate)
    return Number.isFinite(parsed) ? parsed : null
  }
  return {
    dailyLimit: readNumber("dailyLimit"),
    perClaimLimit: readNumber("perClaimLimit"),
    periodLimit: readNumber("periodLimit"),
    annualLimit: readNumber("annualLimit"),
    lateSubmissionDays: readNumber("lateSubmissionDays"),
    requiresExceptionWhenOverLimit:
      typeof record.requiresExceptionWhenOverLimit === "boolean"
        ? record.requiresExceptionWhenOverLimit
        : undefined,
  }
}

export function evaluateClaimPolicyLimits(input: {
  readonly amount: number
  readonly claimDate: string
  readonly today: string
  readonly perClaimLimit: number | null
  readonly dailyTotalBefore: number
  readonly monthlyTotalBefore: number
  readonly annualTotalBefore: number
  readonly rules: ClaimPolicyRules | null
}): {
  readonly flags: readonly ClaimValidationFlag[]
  readonly requiresException: boolean
} {
  const flags: ClaimValidationFlag[] = []
  let requiresException = false

  const perClaim = input.rules?.perClaimLimit ?? input.perClaimLimit
  const perClaimOutcome = applyClaimAmountLimit(input.amount, perClaim)
  if (!perClaimOutcome.ok) {
    flags.push({
      flag: "over_per_claim_limit",
      severity: "error",
      message: "Amount exceeds the per-claim limit.",
      requiresException: true,
    })
    requiresException = true
  }

  const dailyLimit = input.rules?.dailyLimit
  if (dailyLimit != null && dailyLimit > 0) {
    const dailyOutcome = applyClaimAmountLimit(
      input.amount + input.dailyTotalBefore,
      dailyLimit
    )
    if (!dailyOutcome.ok) {
      flags.push({
        flag: "over_daily_limit",
        severity: "error",
        message: "Amount exceeds the daily limit.",
        requiresException: true,
      })
      requiresException = true
    }
  }

  const monthlyLimit = input.rules?.periodLimit ?? null
  if (monthlyLimit != null && monthlyLimit > 0) {
    const monthlyOutcome = applyClaimAmountLimit(
      input.amount + input.monthlyTotalBefore,
      monthlyLimit
    )
    if (!monthlyOutcome.ok) {
      flags.push({
        flag: "over_monthly_limit",
        severity: "error",
        message: "Amount exceeds the monthly limit.",
        requiresException: true,
      })
      requiresException = true
    }
  }

  const annualLimit = input.rules?.annualLimit ?? null
  if (annualLimit != null && annualLimit > 0) {
    const annualOutcome = applyClaimAmountLimit(
      input.amount + input.annualTotalBefore,
      annualLimit
    )
    if (!annualOutcome.ok) {
      flags.push({
        flag: "over_annual_limit",
        severity: "error",
        message: "Amount exceeds the annual limit.",
        requiresException: true,
      })
      requiresException = true
    }
  }

  const lateDays = input.rules?.lateSubmissionDays
  if (lateDays != null && lateDays > 0 && input.claimDate < input.today) {
    const claimMs = Date.parse(`${input.claimDate}T00:00:00.000Z`)
    const todayMs = Date.parse(`${input.today}T00:00:00.000Z`)
    const diffDays = Math.floor((todayMs - claimMs) / 86_400_000)
    if (diffDays > lateDays) {
      flags.push({
        flag: "late_submission",
        severity: "warning",
        message: "Claim was submitted after the allowed submission window.",
        requiresException: true,
      })
      requiresException = true
    }
  }

  if (input.rules?.requiresExceptionWhenOverLimit && requiresException) {
    requiresException = true
  }

  return { flags, requiresException }
}

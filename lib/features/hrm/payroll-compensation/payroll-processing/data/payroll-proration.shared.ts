/** Calendar-day proration factor for partial-period employment (HRM-PAY-014). */

function parseYmd(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`)
}

function daysInclusive(start: string, end: string): number {
  const a = parseYmd(start).getTime()
  const b = parseYmd(end).getTime()
  if (b < a) return 0
  return Math.floor((b - a) / 86_400_000) + 1
}

export type PayrollProrationResult = {
  readonly factor: number
  readonly proratedAmount: string
  readonly reason: string | null
}

/**
 * Prorates a monthly amount when active employment overlaps only part of the pay period.
 * Uses inclusive calendar days in [periodStart, periodEnd] vs overlap with [activeFrom, activeTo].
 */
export function prorateMonthlyAmount(
  amount: string,
  periodStart: string,
  periodEnd: string,
  activeFrom: string | null | undefined,
  activeTo: string | null | undefined
): PayrollProrationResult {
  const monthly = Number.parseFloat(amount)
  if (!Number.isFinite(monthly) || monthly <= 0) {
    return { factor: 1, proratedAmount: amount, reason: null }
  }

  const periodDays = daysInclusive(periodStart, periodEnd)
  if (periodDays <= 0) {
    return {
      factor: 1,
      proratedAmount: monthly.toFixed(2),
      reason: null,
    }
  }

  const overlapStart =
    activeFrom && activeFrom > periodStart ? activeFrom : periodStart
  const overlapEnd = activeTo && activeTo < periodEnd ? activeTo : periodEnd

  if (overlapStart > overlapEnd) {
    return {
      factor: 0,
      proratedAmount: "0.00",
      reason: "no_active_overlap_in_period",
    }
  }

  const activeDays = daysInclusive(overlapStart, overlapEnd)
  const factor = Math.min(1, Math.max(0, activeDays / periodDays))

  if (factor >= 0.9999) {
    return {
      factor: 1,
      proratedAmount: monthly.toFixed(2),
      reason: null,
    }
  }

  const reasons: string[] = []
  if (activeFrom && activeFrom > periodStart) {
    reasons.push("mid_period_join")
  }
  if (activeTo && activeTo < periodEnd) {
    reasons.push("mid_period_exit")
  }

  return {
    factor,
    proratedAmount: (monthly * factor).toFixed(2),
    reason: reasons.length > 0 ? reasons.join("_") : "partial_period",
  }
}

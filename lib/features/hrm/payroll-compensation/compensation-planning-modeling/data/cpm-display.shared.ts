import type { HrmCompensationCycleType } from "../schemas/compensation-planning.shared"

const CYCLE_TYPE_LABELS: Record<HrmCompensationCycleType, string> = {
  annual_review: "Annual review",
  merit_review: "Merit review",
  promotion_review: "Promotion review",
  market_adjustment: "Market adjustment",
  equity_adjustment: "Equity adjustment",
  retention_adjustment: "Retention adjustment",
}

export function compensationCycleTypeLabel(
  cycleType: string,
  fallback: (key: string) => string
): string {
  if (cycleType in CYCLE_TYPE_LABELS) {
    return CYCLE_TYPE_LABELS[cycleType as HrmCompensationCycleType]
  }
  return fallback(cycleType)
}

export function formatCompensationMoney(
  amount: string | null | undefined,
  currency: string
): string {
  if (!amount) return "—"
  const parsed = Number(amount)
  if (!Number.isFinite(parsed)) return "—"
  return `${parsed.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

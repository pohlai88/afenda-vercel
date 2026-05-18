export const BONUS_INCENTIVE_TABS = [
  "plans",
  "cycles",
  "payouts",
  "reports",
  "clawbacks",
] as const

export type BonusIncentiveTab = (typeof BONUS_INCENTIVE_TABS)[number]

export const BONUS_INCENTIVE_DEFAULT_TAB: BonusIncentiveTab = "plans"

export function isBonusIncentiveTab(value: string): value is BonusIncentiveTab {
  return BONUS_INCENTIVE_TABS.includes(value as BonusIncentiveTab)
}

export function bonusStateTone(
  state: string
): "neutral" | "attention" | "success" | "warning" | "destructive" {
  switch (state) {
    case "approved":
    case "locked":
    case "exported_to_payroll":
    case "paid":
    case "recovered":
      return "success"
    case "pending_approval":
    case "calculated":
      return "attention"
    case "returned":
    case "recorded":
      return "warning"
    case "rejected":
    case "void":
      return "destructive"
    default:
      return "neutral"
  }
}

export function formatBonusDate(value: Date | string | null): string {
  if (!value) return "-"
  if (typeof value === "string") return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

export function formatBonusAmount(
  amount: string | null,
  currency = "MYR"
): string {
  return amount ? `${currency} ${amount}` : "-"
}

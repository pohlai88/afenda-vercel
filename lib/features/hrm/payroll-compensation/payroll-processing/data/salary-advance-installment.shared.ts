/**
 * Pure helpers for salary-advance installment scheduling (unit-testable).
 */

/** ISO date-only string comparison for installment due vs payroll period end. */
export function isInstallmentDueOnOrBefore(
  dueAfterPeriodEndIso: string,
  periodEndIso: string
): boolean {
  return dueAfterPeriodEndIso <= periodEndIso
}

export type AdvanceInstallmentPlanInput = {
  readonly totalAmount: string
  readonly count: number
  readonly firstPeriodEndIso: string
}

export type AdvanceInstallmentPlanRow = {
  readonly sequence: number
  readonly dueAfterPeriodEndIso: string
  readonly plannedAmount: string
}

function parseMoney(value: string): number {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

function formatMoney(value: number): string {
  return value.toFixed(2)
}

function addMonthsToIsoDate(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map((part) => Number.parseInt(part, 10))
  const date = new Date(Date.UTC(y, m - 1 + months, d))
  return date.toISOString().slice(0, 10)
}

export function buildAdvanceInstallmentPlan(
  input: AdvanceInstallmentPlanInput
): readonly AdvanceInstallmentPlanRow[] {
  const count = Math.max(1, Math.min(12, input.count))
  const total = parseMoney(input.totalAmount)
  if (total <= 0) return []

  const base = Math.floor((total / count) * 100) / 100
  const rows: AdvanceInstallmentPlanRow[] = []
  let allocated = 0

  for (let sequence = 1; sequence <= count; sequence += 1) {
    const isLast = sequence === count
    const amount = isLast ? formatMoney(total - allocated) : formatMoney(base)
    allocated += parseMoney(amount)
    rows.push({
      sequence,
      dueAfterPeriodEndIso: addMonthsToIsoDate(
        input.firstPeriodEndIso,
        sequence - 1
      ),
      plannedAmount: amount,
    })
  }

  return rows
}

import type { SalaryBenchmarkMarketPosition } from "../schemas/salary-benchmarking.schema"

export function formatBenchmarkMoney(
  value: number | null | undefined,
  currency: string
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${currency} ${value.toFixed(2)}`
}

export function formatBenchmarkRatio(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${(value * 100).toFixed(1)}%`
}

export function salaryBenchmarkMarketPositionLabel(
  position: SalaryBenchmarkMarketPosition
): string {
  switch (position) {
    case "below_market":
      return "Below market"
    case "at_market":
      return "At market"
    case "above_market":
      return "Above market"
    case "outlier":
      return "Outlier"
  }
}

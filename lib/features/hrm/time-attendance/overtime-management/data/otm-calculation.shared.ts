import type { HrmOtmRoundingMode } from "../schemas/otm-workflow-state.shared"

export function applyOtmRounding(
  minutes: number,
  intervalMinutes: number | null | undefined,
  mode: HrmOtmRoundingMode
): number {
  if (mode === "none" || !intervalMinutes || intervalMinutes <= 0) {
    return minutes
  }

  const quotient = minutes / intervalMinutes
  if (mode === "up") return Math.ceil(quotient) * intervalMinutes
  if (mode === "down") return Math.floor(quotient) * intervalMinutes
  return Math.round(quotient) * intervalMinutes
}

export function applyOtmCap(
  candidateMinutes: number,
  usedMinutes: number,
  capMinutes: number | null | undefined
): { payableMinutes: number; capApplied: boolean } {
  if (capMinutes == null || capMinutes <= 0) {
    return { payableMinutes: candidateMinutes, capApplied: false }
  }

  const remaining = Math.max(0, capMinutes - usedMinutes)
  if (candidateMinutes <= remaining) {
    return { payableMinutes: candidateMinutes, capApplied: false }
  }

  return { payableMinutes: remaining, capApplied: true }
}

export function formatOtmMultiplierLabel(multiplierHundredths: number): string {
  return (multiplierHundredths / 100).toFixed(2)
}

export function isoWeekRange(workDate: string): { start: string; end: string } {
  const date = new Date(`${workDate}T12:00:00Z`)
  const day = date.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const toIso = (value: Date) => value.toISOString().slice(0, 10)
  return { start: toIso(monday), end: toIso(sunday) }
}

export function isoMonthRange(workDate: string): { start: string; end: string } {
  const [year, month] = workDate.split("-")
  const start = `${year}-${month}-01`
  const lastDay = new Date(Number(year), Number(month), 0).getDate()
  const end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`
  return { start, end }
}

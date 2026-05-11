export function calculatePlannerSessionMinutes(input: {
  startedAt: Date
  endedAt: Date | null
}): number | null {
  if (!input.endedAt) return null
  const diffMs = input.endedAt.getTime() - input.startedAt.getTime()
  return Math.max(0, Math.round(diffMs / 60000))
}

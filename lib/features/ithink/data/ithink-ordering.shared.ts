const SPACING = 1000

/**
 * Midpoint insert between fractional ordering keys. Returns `null` when there is
 * no integer strictly between `prev` and `next` — caller should run `normalizePositions`.
 */
export function computeInsertPosition(
  prev: number | null,
  next: number | null
): number | null {
  if (prev === null && next === null) return SPACING
  if (prev === null) {
    const candidate = next! - SPACING
    return candidate < 0 ? 0 : candidate
  }
  if (next === null) return prev + SPACING
  const mid = Math.floor((prev + next) / 2)
  if (mid <= prev || mid >= next) return null
  return mid
}

/** Reset positions to evenly spaced integers (e.g. after collision). */
export function normalizePositions(
  ids: string[]
): Array<{ id: string; position: number }> {
  return ids.map((id, index) => ({
    id,
    position: (index + 1) * SPACING,
  }))
}

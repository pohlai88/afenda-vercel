/**
 * Singapore Skills Development Levy parameters — 2026.
 *
 * Source: SkillsFuture Singapore / GoBusiness SDL computation guidance:
 * 0.25% of monthly wages, minimum SGD 2, maximum SGD 11.25.
 */

export const SDL_V2026_01_CODE = "SG-SDL-2026-01" as const
export const SDL_MINIMUM_2026_01 = 2 as const
export const SDL_MAXIMUM_2026_01 = 11.25 as const
export const SDL_RATE_2026_01 = 0.0025 as const

function roundTo2dp(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeSdlV202601(monthlyWages: number): number {
  if (!Number.isFinite(monthlyWages) || monthlyWages <= 0) return 0

  const levy = roundTo2dp(monthlyWages * SDL_RATE_2026_01)
  return Math.min(SDL_MAXIMUM_2026_01, Math.max(SDL_MINIMUM_2026_01, levy))
}

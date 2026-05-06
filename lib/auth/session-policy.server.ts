import "server-only"

/**
 * Must match `session.freshAge` in Better Auth config (seconds).
 * Sessions newer than this are "fresh" for step-up / sensitive surfaces.
 */
export const AUTH_SESSION_FRESH_AGE_SECONDS = 60 * 5

/** Mirrors Better Auth session freshness: `createdAt` within `freshAge`. */
export function isSessionFresh(
  sessionFragment: { createdAt?: Date | string | null },
  freshAgeSeconds: number = AUTH_SESSION_FRESH_AGE_SECONDS
): boolean {
  if (freshAgeSeconds <= 0) return true
  const raw = sessionFragment.createdAt
  if (raw == null) return false
  const created = raw instanceof Date ? raw : new Date(raw)
  const ageSec = (Date.now() - created.getTime()) / 1000
  if (ageSec < 0) return true
  return ageSec <= freshAgeSeconds
}

/** Maximum delivery attempts (initial + retries) before giving up. */
export const STATUTORY_RETRY_MAX_ATTEMPTS = 5

/** Base delay before the first retry (after attempt 1 fails). */
export const STATUTORY_RETRY_BASE_DELAY_MS = 5 * 60 * 1000 // 5 minutes

/** Hard ceiling so the schedule cannot grow unbounded. */
export const STATUTORY_RETRY_MAX_DELAY_MS = 4 * 60 * 60 * 1000 // 4 hours

/** Per-cron-tick batch size — caps concurrency, avoids overload bursts. */
export const STATUTORY_RETRY_BATCH_LIMIT = 25

/**
 * Exponential backoff schedule. `attempts` is the count of attempts that
 * already happened (i.e. the failed delivery's `attempts` column). Returns
 * the delay before the **next** attempt should run.
 */
export function statutoryRetryDelayMs(attempts: number): number {
  if (attempts < 1) return STATUTORY_RETRY_BASE_DELAY_MS
  const exponent = Math.min(attempts - 1, 16)
  const raw = STATUTORY_RETRY_BASE_DELAY_MS * 2 ** exponent
  return Math.min(raw, STATUTORY_RETRY_MAX_DELAY_MS)
}

export function nextStatutoryRetryAt(
  lastCompletedAt: Date,
  attempts: number
): Date {
  return new Date(lastCompletedAt.getTime() + statutoryRetryDelayMs(attempts))
}

export function shouldRetryStatutorySubmission(attempts: number): boolean {
  return attempts < STATUTORY_RETRY_MAX_ATTEMPTS
}

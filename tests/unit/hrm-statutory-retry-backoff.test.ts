/**
 * Golden tests — HRM statutory submission auto-retry backoff policy.
 *
 * Pure-function coverage that locks the published retry contract:
 *   - exponential schedule (5 / 10 / 20 / 40 minutes)
 *   - hard ceiling at STATUTORY_RETRY_MAX_DELAY_MS (4 hours)
 *   - terminal exhaustion at STATUTORY_RETRY_MAX_ATTEMPTS (5)
 *
 * Any change to these constants is a public-contract change because it
 * affects mean-time-to-recovery for HR users and bureau load profile.
 */
import { describe, expect, it } from "vitest"

import {
  nextStatutoryRetryAt,
  shouldRetryStatutorySubmission,
  statutoryRetryDelayMs,
  STATUTORY_RETRY_BASE_DELAY_MS,
  STATUTORY_RETRY_BATCH_LIMIT,
  STATUTORY_RETRY_MAX_ATTEMPTS,
  STATUTORY_RETRY_MAX_DELAY_MS,
} from "../../lib/features/hrm/data/statutory-retry.shared"

describe("HRM statutory retry — backoff policy constants", () => {
  it("base delay is 5 minutes", () => {
    expect(STATUTORY_RETRY_BASE_DELAY_MS).toBe(5 * 60 * 1000)
  })

  it("max delay is 4 hours", () => {
    expect(STATUTORY_RETRY_MAX_DELAY_MS).toBe(4 * 60 * 60 * 1000)
  })

  it("max attempts is 5 — bureau load + audit trail trade-off", () => {
    expect(STATUTORY_RETRY_MAX_ATTEMPTS).toBe(5)
  })

  it("per-tick batch limit is 25 — caps cron worst-case duration", () => {
    expect(STATUTORY_RETRY_BATCH_LIMIT).toBe(25)
  })
})

describe("HRM statutory retry — statutoryRetryDelayMs (exponential)", () => {
  it("returns base delay for invalid attempts (defensive default)", () => {
    expect(statutoryRetryDelayMs(0)).toBe(STATUTORY_RETRY_BASE_DELAY_MS)
    expect(statutoryRetryDelayMs(-3)).toBe(STATUTORY_RETRY_BASE_DELAY_MS)
  })

  it("attempts=1 → 5 minutes (base, no doubling yet)", () => {
    expect(statutoryRetryDelayMs(1)).toBe(5 * 60 * 1000)
  })

  it("attempts=2 → 10 minutes (×2)", () => {
    expect(statutoryRetryDelayMs(2)).toBe(10 * 60 * 1000)
  })

  it("attempts=3 → 20 minutes (×4)", () => {
    expect(statutoryRetryDelayMs(3)).toBe(20 * 60 * 1000)
  })

  it("attempts=4 → 40 minutes (×8)", () => {
    expect(statutoryRetryDelayMs(4)).toBe(40 * 60 * 1000)
  })

  it("attempts=5 → 80 minutes (×16; still under 4h ceiling)", () => {
    expect(statutoryRetryDelayMs(5)).toBe(80 * 60 * 1000)
  })

  it("attempts=10 → capped at 4h ceiling", () => {
    expect(statutoryRetryDelayMs(10)).toBe(STATUTORY_RETRY_MAX_DELAY_MS)
  })

  it("attempts=64 → still capped (no exponent overflow)", () => {
    expect(statutoryRetryDelayMs(64)).toBe(STATUTORY_RETRY_MAX_DELAY_MS)
  })

  it("schedule is monotonically non-decreasing", () => {
    let last = -1
    for (let n = 1; n <= 20; n++) {
      const d = statutoryRetryDelayMs(n)
      expect(d).toBeGreaterThanOrEqual(last)
      last = d
    }
  })

  it("worst-case retry budget across 5 attempts is bounded (~ 5h)", () => {
    // Total wait time before the system gives up = sum of delays after each
    // failed attempt. Verifying bounded recovery time so HR can plan around
    // expected resolution windows.
    const total =
      statutoryRetryDelayMs(1) +
      statutoryRetryDelayMs(2) +
      statutoryRetryDelayMs(3) +
      statutoryRetryDelayMs(4)
    // 5 + 10 + 20 + 40 = 75 minutes between attempt 1 → attempt 5.
    expect(total).toBe(75 * 60 * 1000)
  })
})

describe("HRM statutory retry — nextStatutoryRetryAt", () => {
  const baseInstant = new Date("2026-05-12T00:00:00.000Z")

  it("attempt 1 failure → next attempt 5 minutes later", () => {
    const next = nextStatutoryRetryAt(baseInstant, 1)
    expect(next.toISOString()).toBe("2026-05-12T00:05:00.000Z")
  })

  it("attempt 4 failure → next attempt 40 minutes later", () => {
    const next = nextStatutoryRetryAt(baseInstant, 4)
    expect(next.toISOString()).toBe("2026-05-12T00:40:00.000Z")
  })

  it("ceiling never produces a regression (newer base ⇒ same-or-later next)", () => {
    const earlier = nextStatutoryRetryAt(baseInstant, 6)
    const later = nextStatutoryRetryAt(
      new Date(baseInstant.getTime() + 1000),
      6
    )
    expect(later.getTime()).toBeGreaterThan(earlier.getTime())
  })
})

describe("HRM statutory retry — shouldRetryStatutorySubmission", () => {
  it("returns true while attempts remain", () => {
    expect(shouldRetryStatutorySubmission(0)).toBe(true)
    expect(shouldRetryStatutorySubmission(1)).toBe(true)
    expect(
      shouldRetryStatutorySubmission(STATUTORY_RETRY_MAX_ATTEMPTS - 1)
    ).toBe(true)
  })

  it("returns false at the cap", () => {
    expect(shouldRetryStatutorySubmission(STATUTORY_RETRY_MAX_ATTEMPTS)).toBe(
      false
    )
  })

  it("returns false above the cap (defensive)", () => {
    expect(
      shouldRetryStatutorySubmission(STATUTORY_RETRY_MAX_ATTEMPTS + 100)
    ).toBe(false)
  })
})

"use client"

import { useLayoutEffect, useState } from "react"

/**
 * Client-side "now" anchor with no SSR mismatch.
 *
 * SSR renders with `0`; the first client microtask sets the real timestamp.
 * Components reading `now > 0` know they're on the client and can render
 * relative-time strings without hydration warnings.
 *
 * `useLayoutEffect` (with `queueMicrotask` to defer) ensures the anchor
 * lands before the first paint that consumes it — avoiding a flash of
 * empty time text. The dependency array is empty by design: the anchor is
 * captured once per mount, then drifts only as React re-renders for other
 * reasons. Components that need the time to tick (rare here) can call
 * `setNow(Date.now())` from their own interval.
 */
export function useNow(): number {
  const [now, setNow] = useState(0)
  useLayoutEffect(() => {
    queueMicrotask(() => {
      setNow(Date.now())
    })
  }, [])
  return now
}

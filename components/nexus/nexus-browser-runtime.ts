"use client"

import { useEffect, useState } from "react"

export type BrowserConnectionSnapshot = {
  effectiveType: string | null
  downlinkMbps: number | null
  rttMs: number | null
  saveData: boolean
}

type BrowserNavigator = Navigator & {
  connection?: {
    effectiveType?: string
    downlink?: number
    rtt?: number
    saveData?: boolean
    addEventListener?: (type: "change", listener: () => void) => void
    removeEventListener?: (type: "change", listener: () => void) => void
  }
}

export function readBrowserConnectionSnapshot(): BrowserConnectionSnapshot | null {
  if (typeof navigator === "undefined") return null

  const connection = (navigator as BrowserNavigator).connection
  if (!connection) return null

  return {
    effectiveType:
      typeof connection.effectiveType === "string"
        ? connection.effectiveType
        : null,
    downlinkMbps:
      typeof connection.downlink === "number" ? connection.downlink : null,
    rttMs: typeof connection.rtt === "number" ? connection.rtt : null,
    saveData: Boolean(connection.saveData),
  }
}

const SLOW_DOWNLINK_MBPS_THRESHOLD = 0.5

/**
 * Network Information hints at a constrained link while the browser still reports
 * {@link Navigator.onLine}. Offline is handled separately via {@link useBrowserOnlineStatus}.
 */
export function isBrowserConnectionSlow(
  snapshot: BrowserConnectionSnapshot | null
): boolean {
  if (!snapshot) return false
  const effective = snapshot.effectiveType?.toLowerCase()
  if (effective === "2g" || effective === "slow-2g") return true
  if (
    snapshot.downlinkMbps != null &&
    snapshot.downlinkMbps < SLOW_DOWNLINK_MBPS_THRESHOLD
  ) {
    return true
  }
  return false
}

/** Resolves after mount (`null` first) so SSR HTML never assumes `navigator.onLine`. */
export function useBrowserOnlineStatus(): boolean | null {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine)
    sync()

    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => {
      window.removeEventListener("online", sync)
      window.removeEventListener("offline", sync)
    }
  }, [])

  return isOnline
}

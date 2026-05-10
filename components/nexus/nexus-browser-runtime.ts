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

export function useBrowserOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  )

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

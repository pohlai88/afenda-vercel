"use client"

import { useEffect } from "react"

/** Route segment label for client error boundaries (tags / logs / Sentry). */
export type RouteErrorSegment = string

type ReportOpts = {
  segment: RouteErrorSegment
  error: Error & { digest?: string }
}

/**
 * Single place for client-side route error reporting: browser console + optional Sentry.
 * Do not import the Node-only server logger here (see AGENTS.md runtime errors guidance).
 */
export function useReportRouteError({ segment, error }: ReportOpts): void {
  useEffect(() => {
    console.error(`[route-error:${segment}]`, error)
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        tags: {
          segment,
          digest: error.digest ?? "",
        },
      })
    })
  }, [segment, error])
}

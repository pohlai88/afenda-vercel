import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runLifecycleTransitionDueTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron - applies due future-dated employee lifecycle transitions.
 *
 * Schedule (`vercel.json`): hourly.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-lifecycle-transition-due",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_lifecycle_transition_due.tick",
        { "erp.cron": "hrm-lifecycle-transition-due" },
        () => runLifecycleTransitionDueTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-lifecycle-transition-due",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        applied: summary.applied,
        failed: summary.failed,
        skipped: summary.skipped,
      })
    },
    {
      schedule: { type: "crontab", value: "0 * * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

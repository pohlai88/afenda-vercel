/**
 * HRM-TCI-026 sync watch + HRM-TCI-011 scheduled vendor poll (`poll:`, `vendor:zebra:`, `vendor:ukg:`).
 */
import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runTimeClockCronSyncTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-time-clock-sync",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_time_clock_sync.tick",
        { "erp.cron": "hrm-time-clock-sync" },
        () => runTimeClockCronSyncTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-time-clock-sync",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        watch: summary.watch,
        scheduled: summary.scheduled,
      })
    },
    { schedule: { type: "crontab", value: "0 */6 * * *" } }
  )
}

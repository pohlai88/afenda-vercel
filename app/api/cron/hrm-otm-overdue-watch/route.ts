import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runOtmApprovalOverdueTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — overtime approval overdue detection (daily).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-otm-overdue-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_otm_overdue_watch.tick",
        { "erp.cron": "hrm-otm-overdue-watch" },
        () => runOtmApprovalOverdueTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-otm-overdue-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        skippedAlreadyAudited: summary.skippedAlreadyAudited,
        notificationsSent: summary.notificationsSent,
      })
    },
    {
      schedule: { type: "crontab", value: "55 7 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

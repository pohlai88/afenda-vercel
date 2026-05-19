import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runLeaveApprovalOverdueTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — leave approval overdue detection (daily).
 *
 * Emits `erp.hrm.leave.overdue` once per request left in `submitted` longer than
 * the configured SLA. Idempotent via IAM audit dedupe; best-effort in-app notify.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-leave-overdue-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_leave_overdue_watch.tick",
        { "erp.cron": "hrm-leave-overdue-watch" },
        () => runLeaveApprovalOverdueTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-leave-overdue-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        skippedAlreadyAudited: summary.skippedAlreadyAudited,
        notificationsSent: summary.notificationsSent,
      })
    },
    {
      schedule: { type: "crontab", value: "50 7 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

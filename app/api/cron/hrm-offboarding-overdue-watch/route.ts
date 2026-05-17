import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runOffboardingTaskOverdueTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — offboarding task overdue detection (daily).
 *
 * Emits `HRM_OFFBOARDING_EXIT_AUDIT.task.overdue` once per (instanceId,
 * taskKey) for any checklist task past its `dueDate` on an active offboarding
 * instance. Idempotent via IAM audit dedupe; best-effort per row.
 *
 * Schedule (`vercel.json`): daily at 07:30 UTC.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-offboarding-overdue-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_offboarding_overdue_watch.tick",
        { "erp.cron": "hrm-offboarding-overdue-watch" },
        () => runOffboardingTaskOverdueTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-offboarding-overdue-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        skippedAlreadyAudited: summary.skippedAlreadyAudited,
      })
    },
    {
      schedule: { type: "crontab", value: "30 7 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

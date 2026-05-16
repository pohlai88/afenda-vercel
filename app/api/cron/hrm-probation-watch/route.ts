import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runProbationWatchTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — probation end window (14 UTC calendar days).
 *
 * Emits `erp.hrm.contract.probation_review_due` once per contract and
 * mirrors Orbit pressure via the planner ERP producer. Idempotent via IAM
 * audit dedupe; best-effort per row.
 *
 * Schedule (`vercel.json`): daily at 08:00 UTC (after document expiry watch).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-probation-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_probation_watch.tick",
        { "erp.cron": "hrm-probation-watch" },
        () => runProbationWatchTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-probation-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        skippedAlreadyAudited: summary.skippedAlreadyAudited,
      })
    },
    {
      schedule: { type: "crontab", value: "0 8 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

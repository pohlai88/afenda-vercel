import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runTrainingExpiryWatchTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const maxDuration = 60

/**
 * Daily recertification watch — creates `hrm_training_assignment` rows for
 * expiring certifications with `sourceKind: recertification` (idempotent).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-training-expiry-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_training_expiry_watch.tick",
        { "erp.cron": "hrm-training-expiry-watch" },
        () => runTrainingExpiryWatchTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-training-expiry-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        reassigned: summary.reassigned,
        expiredBands: summary.expiredBands,
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

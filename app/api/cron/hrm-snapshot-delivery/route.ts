import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runHrmSnapshotDeliveryTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — HR snapshot headcount + turnover delivery (audit ledger).
 *
 * `?cadence=weekly|monthly` — weekly Mondays 09:15 UTC; monthly 1st 09:30 UTC.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-snapshot-delivery",
    async () => {
      const startedAt = Date.now()
      const now = new Date()
      const weekly = await runWithNodeOtelSpan(
        "cron.hrm_snapshot_delivery.weekly",
        { "erp.cron": "hrm-snapshot-delivery", "hrm.cadence": "weekly" },
        () => runHrmSnapshotDeliveryTick({ now, cadence: "weekly" })
      )
      const monthly = await runWithNodeOtelSpan(
        "cron.hrm_snapshot_delivery.monthly",
        { "erp.cron": "hrm-snapshot-delivery", "hrm.cadence": "monthly" },
        () => runHrmSnapshotDeliveryTick({ now, cadence: "monthly" })
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-snapshot-delivery",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        weekly,
        monthly,
      })
    },
    {
      schedule: {
        type: "crontab",
        value: "15 9 * * *",
      },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

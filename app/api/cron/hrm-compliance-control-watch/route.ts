import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runComplianceControlWatchTick } from "#features/hrm/server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"
import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-compliance-control-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_compliance_control_watch.tick",
        { "erp.cron": "hrm-compliance-control-watch" },
        () => runComplianceControlWatchTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-compliance-control-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        scannedOrganizations: summary.scannedOrganizations,
        overdueFilings: summary.overdueFilings,
      })
    },
    {
      schedule: { type: "crontab", value: "30 8 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

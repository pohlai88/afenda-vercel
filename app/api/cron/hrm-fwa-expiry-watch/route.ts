import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import {
  runFwaComplianceWatchTick,
  runFwaExpiryWatchTick,
} from "#features/hrm/server"
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
    "hrm-fwa-expiry-watch",
    async () => {
      const startedAt = Date.now()
      const [expiry, compliance] = await runWithNodeOtelSpan(
        "cron.hrm_fwa_expiry_watch.tick",
        { "erp.cron": "hrm-fwa-expiry-watch" },
        async () =>
          Promise.all([runFwaExpiryWatchTick(), runFwaComplianceWatchTick()])
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-fwa-expiry-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        expiry,
        compliance,
      })
    }
  )
}

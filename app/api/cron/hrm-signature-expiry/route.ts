import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runSignatureExpiryTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-signature-expiry",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_signature_expiry.tick",
        { "erp.cron": "hrm-signature-expiry" },
        () => runSignatureExpiryTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-signature-expiry",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        ...summary,
      })
    },
    { schedule: { type: "crontab", value: "0 * * * *" } }
  )
}

import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runSignatureReminderTick } from "#features/tools/server"
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
    "hrm-signature-reminder",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_signature_reminder.tick",
        { "erp.cron": "hrm-signature-reminder" },
        () => runSignatureReminderTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-signature-reminder",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        ...summary,
      })
    },
    { schedule: { type: "crontab", value: "0 9 * * *" } }
  )
}

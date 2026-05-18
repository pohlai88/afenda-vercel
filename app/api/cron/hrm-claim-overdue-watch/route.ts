import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runClaimApprovalOverdueTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — claim approval overdue detection (daily).
 *
 * Emits `erp.hrm.claim.overdue` once per claim left in `submitted` longer than
 * the configured SLA. Idempotent via IAM audit dedupe; best-effort org fanout.
 *
 * Schedule (`vercel.json`): daily at 07:45 UTC.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-claim-overdue-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_claim_overdue_watch.tick",
        { "erp.cron": "hrm-claim-overdue-watch" },
        () => runClaimApprovalOverdueTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-claim-overdue-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        skippedAlreadyAudited: summary.skippedAlreadyAudited,
        fanoutDelivered: summary.fanoutDelivered,
      })
    },
    {
      schedule: { type: "crontab", value: "45 7 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

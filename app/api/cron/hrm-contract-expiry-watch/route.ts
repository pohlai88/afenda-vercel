import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runContractExpiryWatchTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — contract expiry window (30 UTC calendar days).
 *
 * Emits `erp.hrm.lifecycle.contract.audit` once per contract and
 * mirrors Orbit pressure via the planner ERP producer. Idempotent via IAM
 * audit dedupe; best-effort per row.
 *
 * Schedule (`vercel.json`): daily at 09:00 UTC (after probation watch).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-contract-expiry-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_contract_expiry_watch.tick",
        { "erp.cron": "hrm-contract-expiry-watch" },
        () => runContractExpiryWatchTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-contract-expiry-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        skippedAlreadyAudited: summary.skippedAlreadyAudited,
      })
    },
    {
      schedule: { type: "crontab", value: "0 9 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

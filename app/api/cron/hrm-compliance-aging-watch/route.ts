import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runComplianceAgingWatchTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — Phase 3M system-observed aging watch.
 *
 * Daily scan that records when statutory evidence rows have been
 * waiting on bureau acknowledgement for at least
 * `COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS` days. Idempotent
 * per evidence row; the per-evidence Phase 3K timeline picks up the
 * audit event as a `aging_detected` entry so the chain reflects active
 * monitoring, not just human / bureau actions.
 *
 * Schedule (`vercel.json`): once per day at 06:00 UTC. Daily cadence
 * matches HR's review cycle and keeps audit volume predictable; the
 * delay cron auth window is the same as the retry cron so operators
 * have one place to rotate `CRON_SECRET`.
 *
 * Auth: `Bearer ${CRON_SECRET}` (Vercel cron contract).
 *
 * Response body shape:
 *   {
 *     ok: true,
 *     job: "hrm-compliance-aging-watch",
 *     ranAt: ISOString,
 *     durationMs: number,
 *     scanned: number,        // candidates that crossed the threshold
 *     emitted: number,        // new audit rows written this tick (sum of tiers)
 *     emittedByTier: { detected, escalated, critical }, // per-tier audit count
 *     fullyAudited: number,   // candidates whose every qualified tier already exists
 *     fanoutByTier: {
 *       detected:  { attempts, delivered, deliveryFailed, endpointNotConfigured, signingKeyMissing, errored },
 *       escalated: { attempts, delivered, deliveryFailed, endpointNotConfigured, signingKeyMissing, errored },
 *       critical:  { attempts, delivered, deliveryFailed, endpointNotConfigured, signingKeyMissing, errored },
 *     },
 *     criticalFanout: { ... }, // legacy projection of fanoutByTier.critical (Phase 3P)
 *   }
 *
 * The summary is the canonical operator-visible signal. If `scanned >
 * 0` and `emitted = 0` for many ticks in a row, every newly stuck row
 * has already had every qualifying tier recorded and HR / management
 * has manual follow-up to do — `fullyAudited` will equal `scanned`
 * in that steady state. Phase 3P + 3Q surface per-tier outbound
 * delivery counters so operators can distinguish "no fanouts because
 * nothing crossed that tier" from "fanouts firing but receiver is
 * down" at each severity level independently.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-compliance-aging-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_compliance_aging_watch.tick",
        { "erp.cron": "hrm-compliance-aging-watch" },
        () => runComplianceAgingWatchTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-compliance-aging-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        emittedByTier: summary.emittedByTier,
        fullyAudited: summary.fullyAudited,
        fanoutByTier: summary.fanoutByTier,
        criticalFanout: summary.criticalFanout,
      })
    },
    {
      schedule: { type: "crontab", value: "0 6 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

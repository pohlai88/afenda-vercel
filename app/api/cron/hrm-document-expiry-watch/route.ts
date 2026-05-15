import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { runDocumentExpiryWatchTick } from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Vercel cron — Phase 4 document expiry watch.
 *
 * Daily scan that records when an `hrm_document` row crosses each
 * operational expiry severity threshold (`warning_30d`, `warning_14d`,
 * `critical_7d`). Idempotent per `(documentId, tier)`; the cron is the
 * temporal authority — `actorUserId` is `null` to signal autonomous
 * observation, never impersonating a human. Operators still resolve the
 * underlying document; the cron only audits "the system has noticed".
 *
 * Schedule (`vercel.json`): once per day at 07:00 UTC, one hour after
 * the compliance aging watch so audit telemetry is timestamp-ordered
 * and operators see the same `CRON_SECRET` rotation window.
 *
 * Auth: `Bearer ${CRON_SECRET}` (Vercel cron contract).
 *
 * Response body shape:
 *   {
 *     ok: true,
 *     job: "hrm-document-expiry-watch",
 *     ranAt: ISOString,
 *     durationMs: number,
 *     scanned: number,
 *     emitted: number,
 *     emittedByTier: { warning_30d, warning_14d, critical_7d },
 *     fullyAudited: number,
 *   }
 *
 * Like the compliance-aging-watch summary, `scanned > 0` and
 * `emitted = 0` for many ticks in a row means every newly expiring row
 * has every qualifying tier already audited and HR has manual follow-up
 * to do. `fullyAudited === scanned` is the operator-visible steady
 * state for that case.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-document-expiry-watch",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_document_expiry_watch.tick",
        { "erp.cron": "hrm-document-expiry-watch" },
        () => runDocumentExpiryWatchTick()
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-document-expiry-watch",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        emitted: summary.emitted,
        emittedByTier: summary.emittedByTier,
        fullyAudited: summary.fullyAudited,
      })
    },
    {
      schedule: { type: "crontab", value: "0 7 * * *" },
      checkinMargin: 15,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

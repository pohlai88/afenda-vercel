import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { writeIamAuditEvent } from "#lib/auth"
import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"
import {
  eventTypeForStatutoryPack,
  runStatutoryRetryTick,
} from "#features/hrm/server"
import type {
  StatutoryRetryCandidate,
  StatutoryRetryOutcome,
} from "#features/hrm/server"
import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

export const maxDuration = 60

/**
 * Vercel cron — auto-retries failed statutory submissions on an exponential
 * backoff schedule. Bounded by `STATUTORY_RETRY_BATCH_LIMIT` per tick and
 * `STATUTORY_RETRY_MAX_ATTEMPTS` per evidence row.
 *
 * Schedule (`vercel.json`): hourly is the safe default (works on Vercel
 * Hobby + Pro; backoff still completes within a payroll cycle). Tighten to
 * an every-15-minute schedule on Pro/Team if average mean-time-to-recovery
 * matters more than function invocation budget.
 *
 * Auth: `Bearer ${CRON_SECRET}` (Vercel cron contract).
 *
 * Per-row IAM audit emission:
 *   - delivered: `erp.hrm.statutory.<bureau>.submitted` (mirrors the manual
 *     submission audit so reporting can ignore the trigger source).
 *   - failed (retry budget remains):
 *       `erp.execution.statutory_submission.retry.attempted`
 *   - failed (budget exhausted): adds
 *       `erp.execution.statutory_submission.retry.exhausted`
 *       so the audit timeline distinguishes "we'll try again" from
 *       "this needs manual attention".
 *
 * Skips (rule-pack drift / endpoint missing / period unlocked / unsupported
 * pack type) emit no audit — they are operational filters, not state changes.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  return Sentry.withMonitor(
    "hrm-statutory-retry",
    async () => {
      const startedAt = Date.now()
      const summary = await runWithNodeOtelSpan(
        "cron.hrm_statutory_retry.tick",
        { "erp.cron": "hrm-statutory-retry" },
        () => runStatutoryRetryTick()
      )

      await Promise.allSettled(
        summary.outcomes.map((outcome, index) => {
          const candidate = summary.candidates[index]
          if (!candidate) return Promise.resolve()
          return emitRetryAudit(outcome, candidate).catch(() => {})
        })
      )

      return routeJsonOk({
        ok: true,
        job: "hrm-statutory-retry",
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        scanned: summary.scanned,
        delivered: summary.delivered,
        failed: summary.failed,
        skipped: summary.skipped,
        exhausted: summary.exhausted,
      })
    },
    {
      schedule: { type: "crontab", value: "0 * * * *" },
      checkinMargin: 5,
      maxRuntime: 10,
      timezone: "UTC",
    }
  )
}

async function emitRetryAudit(
  outcome: StatutoryRetryOutcome,
  candidate: StatutoryRetryCandidate
): Promise<void> {
  if (outcome.status === "skipped") return

  const baseMetadata = {
    packType: candidate.packType,
    periodId: candidate.periodId,
    rulePackVersion: candidate.rulePackVersion,
    deliveryId: outcome.deliveryId,
    attemptNumber: outcome.attemptNumber,
    trigger: "cron:hrm-statutory-retry",
  } as const

  if (outcome.status === "delivered") {
    const eventType = eventTypeForStatutoryPack(candidate.packType)
    if (!eventType) return
    await writeIamAuditEvent({
      action: eventType,
      organizationId: candidate.organizationId,
      actorUserId: null,
      actorSessionId: null,
      resourceType: "hrm.compliance_evidence",
      resourceId: candidate.evidenceId,
      metadata: {
        ...baseMetadata,
        httpStatus: outcome.httpStatus,
      },
    })
    return
  }

  // outcome.status === "failed"
  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_RETRY_ATTEMPTED,
    organizationId: candidate.organizationId,
    actorUserId: null,
    actorSessionId: null,
    resourceType: "hrm.compliance_evidence",
    resourceId: candidate.evidenceId,
    metadata: {
      ...baseMetadata,
      httpStatus: outcome.httpStatus,
      errorMessage: outcome.errorMessage,
    },
  })

  if (outcome.exhausted) {
    await writeIamAuditEvent({
      action: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_RETRY_EXHAUSTED,
      organizationId: candidate.organizationId,
      actorUserId: null,
      actorSessionId: null,
      resourceType: "hrm.compliance_evidence",
      resourceId: candidate.evidenceId,
      metadata: baseMetadata,
    })
  }
}

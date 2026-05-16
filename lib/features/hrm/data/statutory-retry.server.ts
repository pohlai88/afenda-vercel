import "server-only"

import { and, eq, isNotNull, lte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmComplianceEvidence,
  hrmPayrollPeriod,
  orgEventDelivery,
  orgEventEndpoint,
} from "#lib/db/schema"
import type { CronTickScannedSummary } from "#lib/erp/cron-tick.shared"
import {
  deliverEventNow,
  findEnabledEndpointForEventType,
  getOrgEventEndpointSigningKey,
} from "#features/org-admin/server"

import {
  fetchRunsForStatutoryPack,
  getComplianceEvidence,
} from "./compliance.queries.server"
import { getPayrollPeriod } from "./payroll.queries.server"
import { resolveRulePack } from "./payroll-rule-pack.server"
import type { StatutoryPackType } from "./payroll-rule-pack.server"
import { buildStatutoryPackFromRuns } from "./statutory-pack.server"
import { eventTypeForStatutoryPack } from "./statutory-event-types.shared"
import { updateComplianceSubmissionStateMutation } from "./compliance.mutations.server"
import {
  shouldRetryStatutorySubmission,
  STATUTORY_RETRY_BASE_DELAY_MS,
  STATUTORY_RETRY_BATCH_LIMIT,
  STATUTORY_RETRY_MAX_ATTEMPTS,
  STATUTORY_RETRY_MAX_DELAY_MS,
} from "./statutory-retry.shared"

export {
  nextStatutoryRetryAt,
  shouldRetryStatutorySubmission,
  statutoryRetryDelayMs,
  STATUTORY_RETRY_BASE_DELAY_MS,
  STATUTORY_RETRY_BATCH_LIMIT,
  STATUTORY_RETRY_MAX_ATTEMPTS,
  STATUTORY_RETRY_MAX_DELAY_MS,
} from "./statutory-retry.shared"

// ---------------------------------------------------------------------------
// Query: list candidates for retry across all tenants
// ---------------------------------------------------------------------------

const STATUTORY_PACK_TYPES = [
  "epf_monthly",
  "socso_monthly",
  "eis_monthly",
  "pcb_monthly",
  "hrdf_monthly",
  "ea_annual",
  "borang_e_annual",
] as const

function isStatutoryPackType(value: string): value is StatutoryPackType {
  return (STATUTORY_PACK_TYPES as readonly string[]).includes(value)
}

export type StatutoryRetryCandidate = {
  readonly evidenceId: string
  readonly organizationId: string
  readonly periodId: string
  readonly packType: StatutoryPackType
  readonly countryCode: string
  readonly rulePackVersion: string
  readonly inputHash: string
  readonly outputHash: string
  readonly priorDeliveryId: string
  readonly priorAttempts: number
  readonly priorCompletedAt: Date
  /**
   * Phase 3S — original generation instant from `hrm_compliance_evidence`,
   * replayed into `buildStatutoryPackFromRuns({ now })` so EA / Borang E
   * (both of which embed `generatedAt` in the hashed body) re-derive
   * byte-identically. Without it, annual-pack retries would always fail
   * the `evidence_drift` guard.
   */
  readonly priorGeneratedAt: Date
}

/**
 * Cross-tenant scan for failed statutory evidence whose backoff window has
 * elapsed and whose attempt budget is not exhausted. Cron-only — caller MUST
 * authenticate via the Vercel `CRON_SECRET` Bearer header before invoking.
 *
 * Performs a deterministic SQL filter so the heavy lifting stays in Postgres:
 *   - evidence.submissionState = 'failed'
 *   - evidence.submissionDeliveryId IS NOT NULL
 *   - evidence.periodId IS NOT NULL (period-scoped packs only — annual EA
 *     bundles will get their own retry path when implemented)
 *   - prior delivery.attempts < STATUTORY_RETRY_MAX_ATTEMPTS
 *   - prior delivery.completedAt + statutoryRetryDelayMs(attempts) <= now
 *   - join hrm_payroll_period to ensure the period is still locked (do not
 *     retry submissions for periods that were unlocked since failure)
 *
 * Limited to {@link STATUTORY_RETRY_BATCH_LIMIT} per call.
 */
export async function listStatutoryRetryCandidates(
  now: Date = new Date()
): Promise<StatutoryRetryCandidate[]> {
  // Deadline expression: prior delivery.completedAt + dynamic backoff <= now.
  // The backoff is `BASE_DELAY_MS * 2 ^ (attempts - 1)`, capped to MAX_DELAY_MS.
  // Building this as raw SQL keeps the filter inside Postgres (no full scan).
  const baseSeconds = Math.floor(STATUTORY_RETRY_BASE_DELAY_MS / 1000)
  const maxSeconds = Math.floor(STATUTORY_RETRY_MAX_DELAY_MS / 1000)

  // `attempts` is bounded by STATUTORY_RETRY_MAX_ATTEMPTS (5), so the
  // exponent (attempts - 1) is bounded by 4 — no overflow risk in `power`.
  const backoffExpression = sql`LEAST(
    ${baseSeconds} * POWER(2, GREATEST(${orgEventDelivery.attempts} - 1, 0)),
    ${maxSeconds}
  )`

  const rows = await db
    .select({
      evidenceId: hrmComplianceEvidence.id,
      organizationId: hrmComplianceEvidence.organizationId,
      periodId: hrmComplianceEvidence.periodId,
      packType: hrmComplianceEvidence.packType,
      countryCode: hrmComplianceEvidence.countryCode,
      rulePackVersion: hrmComplianceEvidence.rulePackVersion,
      inputHash: hrmComplianceEvidence.inputHash,
      outputHash: hrmComplianceEvidence.outputHash,
      priorGeneratedAt: hrmComplianceEvidence.generatedAt,
      priorDeliveryId: orgEventDelivery.id,
      priorAttempts: orgEventDelivery.attempts,
      priorCompletedAt: orgEventDelivery.completedAt,
      periodState: hrmPayrollPeriod.state,
    })
    .from(hrmComplianceEvidence)
    .innerJoin(
      orgEventDelivery,
      eq(orgEventDelivery.id, hrmComplianceEvidence.submissionDeliveryId)
    )
    .innerJoin(
      orgEventEndpoint,
      and(
        eq(orgEventEndpoint.id, orgEventDelivery.endpointId),
        eq(
          orgEventEndpoint.organizationId,
          hrmComplianceEvidence.organizationId
        )
      )
    )
    .innerJoin(
      hrmPayrollPeriod,
      eq(hrmPayrollPeriod.id, hrmComplianceEvidence.periodId)
    )
    .where(
      and(
        eq(hrmComplianceEvidence.submissionState, "failed"),
        isNotNull(hrmComplianceEvidence.submissionDeliveryId),
        isNotNull(hrmComplianceEvidence.periodId),
        eq(hrmPayrollPeriod.state, "locked"),
        sql`${orgEventDelivery.attempts} < ${STATUTORY_RETRY_MAX_ATTEMPTS}`,
        isNotNull(orgEventDelivery.completedAt),
        lte(
          sql`${orgEventDelivery.completedAt} + (${backoffExpression}) * INTERVAL '1 second'`,
          now
        )
      )
    )
    .limit(STATUTORY_RETRY_BATCH_LIMIT)

  return rows
    .filter(
      (r) =>
        r.periodId != null &&
        r.priorCompletedAt != null &&
        isStatutoryPackType(r.packType)
    )
    .map((r) => ({
      evidenceId: r.evidenceId,
      organizationId: r.organizationId,
      periodId: r.periodId as string,
      packType: r.packType as StatutoryPackType,
      countryCode: r.countryCode,
      rulePackVersion: r.rulePackVersion,
      inputHash: r.inputHash,
      outputHash: r.outputHash,
      priorGeneratedAt: r.priorGeneratedAt,
      priorDeliveryId: r.priorDeliveryId,
      priorAttempts: r.priorAttempts,
      priorCompletedAt: r.priorCompletedAt as Date,
    }))
}

// ---------------------------------------------------------------------------
// Idempotent retry runner — single evidence at a time
// ---------------------------------------------------------------------------

export type StatutoryRetryOutcome =
  | {
      readonly status: "delivered"
      readonly evidenceId: string
      readonly deliveryId: string
      readonly httpStatus: number | null
      readonly attemptNumber: number
    }
  | {
      readonly status: "failed"
      readonly evidenceId: string
      readonly deliveryId: string
      readonly httpStatus: number | null
      readonly errorMessage: string
      readonly attemptNumber: number
      readonly exhausted: boolean
    }
  | {
      readonly status: "skipped"
      readonly evidenceId: string
      readonly reason:
        | "endpoint_missing"
        | "rule_pack_drift"
        | "evidence_drift"
        | "period_changed"
        | "unsupported_pack_type"
    }

/**
 * Re-derives the canonical pack from current state and retries delivery for a
 * single evidence row. Safe to call concurrently for distinct evidence rows
 * (no shared mutable state); two simultaneous retries against the same row
 * may both succeed — the receiver's `payloadHash` idempotency must absorb the
 * duplicate. Acceptable trade-off for cron-driven retry; row-level locking
 * is a future improvement when contention shows up.
 */
export async function retryStatutorySubmissionForEvidence(
  candidate: StatutoryRetryCandidate
): Promise<StatutoryRetryOutcome> {
  const eventType = eventTypeForStatutoryPack(candidate.packType)
  if (!eventType) {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "unsupported_pack_type",
    }
  }

  const period = await getPayrollPeriod(
    candidate.organizationId,
    candidate.periodId
  )
  if (!period || period.state !== "locked") {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "period_changed",
    }
  }

  let rulePack
  try {
    rulePack = resolveRulePack(
      candidate.countryCode,
      new Date(period.periodEnd)
    )
  } catch {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "rule_pack_drift",
    }
  }
  if (rulePack.version !== candidate.rulePackVersion) {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "rule_pack_drift",
    }
  }

  const runs = await fetchRunsForStatutoryPack(
    candidate.organizationId,
    candidate.periodId
  )
  if (runs.length === 0) {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "evidence_drift",
    }
  }

  // Phase 3S — replay the original generation instant captured on the
  // evidence row so EA / Borang E (both of which embed `generatedAt` in
  // the hashed body) re-derive byte-identically. Otherwise the
  // `evidence_drift` guard immediately below would always fail for
  // annual-pack retries.
  const { payload, inputHash, outputHash } = buildStatutoryPackFromRuns(
    rulePack,
    candidate.packType,
    runs,
    { now: candidate.priorGeneratedAt }
  )
  if (
    inputHash !== candidate.inputHash ||
    outputHash !== candidate.outputHash
  ) {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "evidence_drift",
    }
  }

  const endpoint = await findEnabledEndpointForEventType(
    candidate.organizationId,
    eventType
  )
  if (!endpoint) {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "endpoint_missing",
    }
  }

  const signingKey = await getOrgEventEndpointSigningKey({
    organizationId: candidate.organizationId,
    endpointId: endpoint.id,
  })
  if (!signingKey) {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "endpoint_missing",
    }
  }

  // Re-read evidence so the envelope's `generatedAt` matches whatever the
  // current row reports — never reconstruct it from the candidate timestamp.
  const evidence = await getComplianceEvidence(
    candidate.organizationId,
    candidate.evidenceId
  )
  if (!evidence) {
    return {
      status: "skipped",
      evidenceId: candidate.evidenceId,
      reason: "evidence_drift",
    }
  }

  const envelope = {
    id: crypto.randomUUID(),
    type: eventType,
    occurredAt: new Date().toISOString(),
    organizationId: candidate.organizationId,
    data: {
      evidenceId: candidate.evidenceId,
      countryCode: candidate.countryCode,
      packType: candidate.packType,
      rulePackVersion: candidate.rulePackVersion,
      period: {
        id: period.id,
        start: period.periodStart,
        end: period.periodEnd,
        paymentDate: period.paymentDate,
      },
      provenance: {
        inputHash,
        outputHash,
        generatedAt: evidence.generatedAt.toISOString(),
        retryAttempt: candidate.priorAttempts + 1,
      },
      payload,
    },
  }

  const { delivery, result } = await deliverEventNow({
    endpoint,
    signingKey,
    envelope,
  })

  const succeeded = result.state === "delivered"
  const attemptNumber = candidate.priorAttempts + 1

  await updateComplianceSubmissionStateMutation(
    candidate.organizationId,
    candidate.evidenceId,
    succeeded ? "submitted" : "failed",
    {
      submissionDeliveryId: delivery.id,
    }
  )

  if (succeeded) {
    return {
      status: "delivered",
      evidenceId: candidate.evidenceId,
      deliveryId: delivery.id,
      httpStatus: result.httpStatus,
      attemptNumber,
    }
  }

  return {
    status: "failed",
    evidenceId: candidate.evidenceId,
    deliveryId: delivery.id,
    httpStatus: result.httpStatus,
    errorMessage:
      result.errorMessage ?? "Delivery failed without a receiver response.",
    attemptNumber,
    exhausted: !shouldRetryStatutorySubmission(attemptNumber),
  }
}

// ---------------------------------------------------------------------------
// Per-tick aggregate runner
// ---------------------------------------------------------------------------

export type StatutoryRetryTickSummary = CronTickScannedSummary & {
  readonly delivered: number
  readonly failed: number
  readonly skipped: number
  readonly exhausted: number
  readonly outcomes: readonly StatutoryRetryOutcome[]
  readonly candidates: readonly StatutoryRetryCandidate[]
}

/**
 * Scans for retry candidates and runs each one with isolated error handling
 * (`Promise.allSettled` so one bad row never poisons the rest of the batch).
 * Returns outcomes index-aligned with `candidates` so the caller can emit
 * per-row IAM audit events with the originating evidence/period context.
 *
 * Audit emission is the caller's responsibility — keeping `next/headers`
 * coupling out of this module is what makes the runner unit-testable.
 */
export async function runStatutoryRetryTick(
  now: Date = new Date()
): Promise<StatutoryRetryTickSummary> {
  const candidates = await listStatutoryRetryCandidates(now)
  const settled = await Promise.allSettled(
    candidates.map((c) => retryStatutorySubmissionForEvidence(c))
  )

  const outcomes: StatutoryRetryOutcome[] = []
  let delivered = 0
  let failed = 0
  let skipped = 0
  let exhausted = 0

  for (let i = 0; i < settled.length; i++) {
    const r = settled[i]!
    const candidate = candidates[i]!
    if (r.status === "fulfilled") {
      outcomes.push(r.value)
      if (r.value.status === "delivered") delivered++
      else if (r.value.status === "skipped") skipped++
      else {
        failed++
        if (r.value.exhausted) exhausted++
      }
    } else {
      // Unexpected throw inside the runner — never crash the cron tick.
      outcomes.push({
        status: "failed",
        evidenceId: candidate.evidenceId,
        deliveryId: candidate.priorDeliveryId,
        httpStatus: null,
        errorMessage:
          r.reason instanceof Error
            ? r.reason.message.slice(0, 256)
            : "Unexpected retry runner exception",
        attemptNumber: candidate.priorAttempts + 1,
        exhausted: !shouldRetryStatutorySubmission(candidate.priorAttempts + 1),
      })
      failed++
    }
  }

  return {
    scanned: candidates.length,
    delivered,
    failed,
    skipped,
    exhausted,
    outcomes,
    candidates,
  }
}

import "server-only"

import {
  deliverEventNow,
  findEnabledEndpointForEventType,
  getOrgEventEndpointSigningKey,
  type OrgEventEnvelope,
} from "#features/org-admin/server"

import type { AgingWatchCandidate } from "./compliance-aging-watch.server"
import {
  COMPLIANCE_AGING_TIERS,
  complianceAgingTierThresholdDays,
  type ComplianceAgingTier,
} from "./compliance-operational-health.shared"

/**
 * Phase 3P + 3Q — Compliance aging tier fanout.
 *
 * Closes the audit→action loop on Phase 3O's severity tier model:
 * when the watch cron writes a successful aging audit at any tier,
 * the system fires one signed outbound delivery per tier into the
 * org's configured `org_event_delivery` pipeline so HR tooling
 * (Slack, PagerDuty, Jira, Service Cloud) gets paged at the right
 * severity level — not on the next weekly review.
 *
 * Doctrine:
 *   - One fanout per evidence row × tier, ever. Idempotency is
 *     anchored by the Phase 3O audit dedup: the cron writes each
 *     tier audit at most once per row, and ONLY then attempts a
 *     fanout. A row that crosses all three tiers in the same tick
 *     fires three distinct deliveries (one per tier).
 *   - Tier independence. Orgs subscribe per tier — the typical
 *     pattern is `detected` → digest, `escalated` → on-call,
 *     `critical` → PagerDuty / regulator incident. Missing
 *     subscriptions at one tier never block another.
 *   - Best-effort. Receiver outages, missing endpoints, or rotated
 *     signing keys all produce structured outcome codes, never
 *     exceptions — the cron tick keeps counting.
 *   - Operational facets only. The envelope payload carries severity
 *     metadata sufficient to route a page (severity tier, age, pack
 *     type, period id) — never payroll bytes, never PII. Receivers
 *     call back into Afenda's API under their own auth for detail.
 *   - HRM domain namespace for event types, NOT the execution
 *     namespace used for the audit actions. Receivers subscribe to
 *     the product-shaped topic; the audit is the internal
 *     lifecycle truth.
 */

/**
 * Canonical map: tier -> subscribable event type. Receivers wire
 * each topic separately; orgs commonly subscribe their digest channel
 * to `detected`, on-call to `escalated`, and PagerDuty to `critical`.
 *
 * Must stay in sync with the entries in `ORG_EVENT_TYPES`
 * (`lib/features/org-admin/constants.ts`). The schema gate
 * `eventTypeSchema` rejects anything outside the allowlist, so the
 * delivery layer cannot accept a typo here even by accident.
 */
export const HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES: Readonly<
  Record<ComplianceAgingTier, string>
> = {
  detected: "erp.hrm.compliance.aging.detected",
  escalated: "erp.hrm.compliance.aging.escalated",
  critical: "erp.hrm.compliance.aging.critical",
} as const

/**
 * Phase 3P legacy alias — Phase 3P shipped critical-only. Phase 3Q
 * generalizes the API to all three tiers, but the original constant
 * is preserved so downstream code, dashboards, and tests that pinned
 * the critical-only contract continue to compile.
 */
export const HRM_COMPLIANCE_AGING_CRITICAL_EVENT_TYPE =
  HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES.critical

/**
 * Reserved keys that MUST NEVER appear in the fanout envelope payload.
 * These are the PII / payroll byte categories the Phase 3O audit
 * doctrine already forbids in `iam_audit_event.metadata`; the gate is
 * repeated here so the outbound contract is independently testable.
 *
 * Keep in sync with `eslint.config.mjs` `afenda/hrm-pii-audit-metadata`.
 */
export const HRM_FANOUT_FORBIDDEN_KEYS = [
  "taxIdentifierNumber",
  "bankAccountNumber",
  "nationalId",
  "payrollBankAccount",
  "icNumber",
  "passportNumber",
  "payload",
  "employees",
  "employeeName",
  "employeeId",
  "ssn",
] as const

/**
 * Pure: builds the operational-facets-only `data` payload that ships
 * inside the delivery envelope, parameterized on tier so the same
 * shape lands in receivers regardless of severity. Deterministic
 * given a candidate + tier — the envelope is canonicalized later by
 * the delivery pipeline (`canonicalJsonStringify` sorts keys), but
 * keeping this function pure means the golden tests can lock the
 * exact shape per tier.
 *
 * NEVER includes payroll bytes or employee PII. See
 * {@link HRM_FANOUT_FORBIDDEN_KEYS} for the gate the tests enforce.
 */
export function buildAgingTierEventEnvelopeData(
  candidate: AgingWatchCandidate,
  tier: ComplianceAgingTier
): Record<string, unknown> {
  return {
    evidenceId: candidate.evidenceId,
    countryCode: candidate.countryCode,
    packType: candidate.packType,
    rulePackVersion: candidate.rulePackVersion,
    periodId: candidate.periodId,
    severityTier: tier,
    ageDays: candidate.ageDays,
    tierThresholdDays: complianceAgingTierThresholdDays(tier),
    submittedSinceUpdatedAt: candidate.submittedSinceUpdatedAt.toISOString(),
  }
}

/**
 * Phase 3P legacy alias — same shape as
 * {@link buildAgingTierEventEnvelopeData} with `tier="critical"`. Tests
 * that locked the critical envelope contract continue to pass without
 * change; new tests use the tier-parameterized form.
 */
export function buildAgingCriticalEventEnvelopeData(
  candidate: AgingWatchCandidate
): Record<string, unknown> {
  return buildAgingTierEventEnvelopeData(candidate, "critical")
}

/** Distinct outcome codes for a single per-candidate per-tier fanout attempt. */
export type AgingTierFanoutOutcome =
  | { readonly code: "delivered"; readonly deliveryId: string }
  | {
      readonly code: "delivery_failed"
      readonly deliveryId: string
      readonly httpStatus: number | null
    }
  | { readonly code: "endpoint_not_configured" }
  | { readonly code: "signing_key_missing" }
  | { readonly code: "fanout_error"; readonly message: string }

/** Phase 3P legacy alias — single-tier outcome shape. */
export type AgingCriticalFanoutOutcome = AgingTierFanoutOutcome

/**
 * Best-effort fanout for a single candidate at a specific tier.
 *
 * Sequence:
 *   1. Resolve the org's enabled endpoint subscribed to the tier's
 *      canonical event type. Missing -> `endpoint_not_configured`
 *      (the most common outcome for orgs that haven't wired the
 *      lower tiers yet — `detected` and `escalated` are typically
 *      added later than `critical`).
 *   2. Load the endpoint's signing key. Missing ->
 *      `signing_key_missing` (rotation race; a future tick can
 *      re-attempt only if we add a retry queue here, which Phase 3Q
 *      does NOT).
 *   3. Build a deterministic envelope and `deliverEventNow`. The
 *      synchronous helper writes the `org_event_delivery` row and
 *      returns the receiver's HTTP outcome.
 *   4. NEVER throws. Any unexpected exception becomes `fanout_error`
 *      so the tick summary stays meaningful even on partial outage.
 */
export async function fanoutAgingTierEvent(input: {
  candidate: AgingWatchCandidate
  tier: ComplianceAgingTier
  now: Date
}): Promise<AgingTierFanoutOutcome> {
  const eventType = HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES[input.tier]
  try {
    const endpoint = await findEnabledEndpointForEventType(
      input.candidate.organizationId,
      eventType
    )
    if (!endpoint) return { code: "endpoint_not_configured" }

    const signingKey = await getOrgEventEndpointSigningKey({
      organizationId: input.candidate.organizationId,
      endpointId: endpoint.id,
    })
    if (!signingKey) return { code: "signing_key_missing" }

    const envelope: OrgEventEnvelope = {
      id: crypto.randomUUID(),
      type: eventType,
      occurredAt: input.now.toISOString(),
      organizationId: input.candidate.organizationId,
      data: buildAgingTierEventEnvelopeData(input.candidate, input.tier),
    }

    const { delivery, result } = await deliverEventNow({
      endpoint,
      signingKey,
      envelope,
    })

    if (result.state === "delivered") {
      return { code: "delivered", deliveryId: delivery.id }
    }
    return {
      code: "delivery_failed",
      deliveryId: delivery.id,
      httpStatus: result.httpStatus,
    }
  } catch (err) {
    return {
      code: "fanout_error",
      message: err instanceof Error ? err.message : "Unknown fanout error",
    }
  }
}

/**
 * Phase 3P legacy alias — critical-only fanout. Routes through the
 * tier-aware fanout with `tier="critical"` so call-sites that pinned
 * the original API continue to work while new code uses the
 * tier-parameterized form.
 */
export async function fanoutAgingCriticalEvent(input: {
  candidate: AgingWatchCandidate
  now: Date
}): Promise<AgingTierFanoutOutcome> {
  return fanoutAgingTierEvent({
    candidate: input.candidate,
    tier: "critical",
    now: input.now,
  })
}

/**
 * Per-tier fanout counters. Stable shape across all return paths so
 * the cron route response can render a predictable JSON summary even
 * when no fanouts attempted. Sums to {@link AgingTierFanoutCounters.attempts}.
 */
export type AgingTierFanoutCounters = {
  readonly attempts: number
  readonly delivered: number
  readonly deliveryFailed: number
  readonly endpointNotConfigured: number
  readonly signingKeyMissing: number
  readonly errored: number
}

/** Phase 3P legacy alias — same shape, critical-only naming. */
export type AgingCriticalFanoutCounters = AgingTierFanoutCounters

/** Zero-initialized counter snapshot used for early-return paths. */
export function emptyAgingTierFanoutCounters(): AgingTierFanoutCounters {
  return {
    attempts: 0,
    delivered: 0,
    deliveryFailed: 0,
    endpointNotConfigured: 0,
    signingKeyMissing: 0,
    errored: 0,
  }
}

/** Phase 3P legacy alias — same zero shape. */
export function emptyAgingCriticalFanoutCounters(): AgingTierFanoutCounters {
  return emptyAgingTierFanoutCounters()
}

/**
 * Per-tier counter MAP. One zero counter per tier — used by the cron
 * tick as the running accumulator and surfaced verbatim in the route
 * JSON response so operators see a stable shape every tick.
 */
export type AgingTierFanoutCountersByTier = Readonly<
  Record<ComplianceAgingTier, AgingTierFanoutCounters>
>

/** Zero-initialized per-tier counter map for early-return paths. */
export function emptyAgingTierFanoutCountersByTier(): AgingTierFanoutCountersByTier {
  const out = {} as Record<ComplianceAgingTier, AgingTierFanoutCounters>
  for (const tier of COMPLIANCE_AGING_TIERS) {
    out[tier] = emptyAgingTierFanoutCounters()
  }
  return out
}

/**
 * Pure: folds a single fanout outcome into a counter snapshot.
 * Returns a NEW snapshot — caller manages accumulation. Extracted so
 * tests lock the outcome -> counter mapping without mocking the
 * delivery pipeline.
 */
export function tallyAgingTierFanoutOutcome(
  current: AgingTierFanoutCounters,
  outcome: AgingTierFanoutOutcome
): AgingTierFanoutCounters {
  const next: AgingTierFanoutCounters = {
    attempts: current.attempts + 1,
    delivered: current.delivered,
    deliveryFailed: current.deliveryFailed,
    endpointNotConfigured: current.endpointNotConfigured,
    signingKeyMissing: current.signingKeyMissing,
    errored: current.errored,
  }
  switch (outcome.code) {
    case "delivered":
      return { ...next, delivered: next.delivered + 1 }
    case "delivery_failed":
      return { ...next, deliveryFailed: next.deliveryFailed + 1 }
    case "endpoint_not_configured":
      return {
        ...next,
        endpointNotConfigured: next.endpointNotConfigured + 1,
      }
    case "signing_key_missing":
      return { ...next, signingKeyMissing: next.signingKeyMissing + 1 }
    case "fanout_error":
      return { ...next, errored: next.errored + 1 }
  }
}

/** Phase 3P legacy alias — same fold semantics. */
export function tallyAgingCriticalFanoutOutcome(
  current: AgingTierFanoutCounters,
  outcome: AgingTierFanoutOutcome
): AgingTierFanoutCounters {
  return tallyAgingTierFanoutOutcome(current, outcome)
}

/**
 * Pure: folds a single tier-tagged outcome into the per-tier counter
 * map. The cron tick uses this to accumulate one map across the whole
 * batch so the route response surfaces detected/escalated/critical
 * counters side-by-side.
 */
export function tallyAgingTierFanoutOutcomeByTier(
  current: AgingTierFanoutCountersByTier,
  tier: ComplianceAgingTier,
  outcome: AgingTierFanoutOutcome
): AgingTierFanoutCountersByTier {
  const next: Record<ComplianceAgingTier, AgingTierFanoutCounters> = {
    ...current,
  }
  next[tier] = tallyAgingTierFanoutOutcome(current[tier], outcome)
  return next
}

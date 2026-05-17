/**
 * Document expiry watch — pure helpers (Phase 4 / PR 6).
 *
 * Mirrors the operational shape of `compliance-aging-watch.shared.ts`:
 * a deterministic tier classifier + dedup partitioner that the cron tick
 * uses to decide which `iam_audit_event` rows to emit. Pure module so
 * unit tests exercise the math without a database round trip.
 *
 * Tiers (countdown semantics — closer to expiry = higher severity):
 *   - `warning_30d` — expiry within 30 days (advance notice for HR)
 *   - `warning_14d` — expiry within 14 days (action queue)
 *   - `critical_7d` — expiry within 7 days (urgent intervention)
 *
 * Doctrine:
 *   - Server is the temporal authority — `now` is passed in by the cron
 *     so tests can freeze the clock.
 *   - Tiers are independent. A row 5 days from expiry on its first scan
 *     emits all three tiers in a single tick so the audit chain is
 *     honest about every threshold the row crossed before the system
 *     observed it.
 *   - Already-expired rows (`daysToExpiry < 0`) emit `critical_7d` once
 *     and stop — keeping closure auditable without churning the chain
 *     after the fact.
 */
export const DOCUMENT_EXPIRY_TIERS = [
  "warning_30d",
  "warning_14d",
  "critical_7d",
] as const

export type DocumentExpiryTier = (typeof DOCUMENT_EXPIRY_TIERS)[number]

/** Threshold (days remaining) at which each tier becomes qualifying. */
export const DOCUMENT_EXPIRY_TIER_THRESHOLD_DAYS: Readonly<
  Record<DocumentExpiryTier, number>
> = {
  warning_30d: 30,
  warning_14d: 14,
  critical_7d: 7,
}

/** Highest tier whose threshold the row has crossed. */
export const DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS: Readonly<
  Record<DocumentExpiryTier, string>
> = {
  warning_30d: "erp.hrm.document.expiry_warning_30d",
  warning_14d: "erp.hrm.document.expiry_warning_14d",
  critical_7d: "erp.hrm.document.expiry_critical_7d",
}

/** Look-ahead horizon — equals the largest tier threshold (days). */
export const DOCUMENT_EXPIRY_LOOKAHEAD_DAYS = 30

/**
 * Per-tick batch ceiling. Picked so a single org with hundreds of
 * expiring documents after a long backlog still completes within the
 * Vercel cron `maxDuration` budget. Worst case: 50 candidates × 3 tiers
 * = 150 audit writes.
 */
export const DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT = 50

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Pure: returns the cutoff date such that any document whose
 * `effectiveTo <= cutoff` has crossed the largest tier (`warning_30d`).
 * Already-expired rows are included by default; SQL filters cap the
 * past-window in the query layer.
 */
export function computeDocumentExpiryCutoff(now: Date): Date {
  return new Date(now.getTime() + DOCUMENT_EXPIRY_LOOKAHEAD_DAYS * MS_PER_DAY)
}

/**
 * Pure: integer days remaining until `effectiveTo`. Negative when the
 * document is already past expiry.
 */
export function daysToExpiry(now: Date, effectiveTo: Date): number {
  const diff = effectiveTo.getTime() - now.getTime()
  return Math.floor(diff / MS_PER_DAY)
}

/**
 * Pure: returns the tiers a document has crossed at this distance.
 * Order-stable (least severe -> most severe) so the audit chain reads
 * top-down by severity progression.
 *
 * - `daysToExpiry >= 30` → no tier crossed
 * - `daysToExpiry < 30` → warning_30d
 * - `daysToExpiry < 14` → warning_30d + warning_14d
 * - `daysToExpiry < 7`  → all three
 */
export function documentExpiryTiersCrossed(
  daysRemaining: number
): readonly DocumentExpiryTier[] {
  const out: DocumentExpiryTier[] = []
  for (const tier of DOCUMENT_EXPIRY_TIERS) {
    if (daysRemaining < DOCUMENT_EXPIRY_TIER_THRESHOLD_DAYS[tier]) {
      out.push(tier)
    }
  }
  return out
}

export type DocumentExpiryCandidate = {
  readonly documentId: string
  readonly organizationId: string
  readonly employeeId: string | null
  readonly documentType: string
  readonly title: string
  readonly effectiveTo: Date
  /** `effectiveTo - now`, integer days; negative when already expired. */
  readonly daysToExpiry: number
}

export type DocumentExpiryTierEmission = {
  readonly tier: DocumentExpiryTier
  readonly candidate: DocumentExpiryCandidate
}

/**
 * Pure partitioner — given the candidate list and a per-document map of
 * already-emitted tier audit actions, returns:
 *   - `toEmit`: per-tier emissions still needed
 *   - `fullyAudited`: candidates whose every qualified tier already exists
 *
 * Mirrors the shape used by the compliance aging watch so reviewers can
 * lock both partitioners against the same intent.
 */
export function partitionDocumentExpiryEmissions(
  candidates: readonly DocumentExpiryCandidate[],
  alreadyEmittedActionsByDocumentId: ReadonlyMap<string, ReadonlySet<string>>
): {
  readonly toEmit: readonly DocumentExpiryTierEmission[]
  readonly fullyAudited: readonly DocumentExpiryCandidate[]
} {
  const toEmit: DocumentExpiryTierEmission[] = []
  const fullyAudited: DocumentExpiryCandidate[] = []
  for (const candidate of candidates) {
    const already =
      alreadyEmittedActionsByDocumentId.get(candidate.documentId) ??
      EMPTY_ACTION_SET
    const tiers = documentExpiryTiersCrossed(candidate.daysToExpiry)
    const remaining = tiers.filter(
      (tier) => !already.has(DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS[tier])
    )
    if (remaining.length === 0) {
      if (tiers.length > 0) fullyAudited.push(candidate)
      continue
    }
    for (const tier of remaining) toEmit.push({ tier, candidate })
  }
  return { toEmit, fullyAudited }
}

const EMPTY_ACTION_SET: ReadonlySet<string> = new Set<string>()

/**
 * Pure: builds the metadata blob attached to the IAM audit event.
 * Operational facets only — no document bytes, no PII, no payroll data.
 * `documentId` is the resource id; `documentType` and the integer
 * `daysToExpiry` give HR enough context to triage without joining
 * back to `hrm_document`.
 */
export function buildDocumentExpiryAuditMetadata(
  candidate: DocumentExpiryCandidate,
  tier: DocumentExpiryTier
): Record<string, unknown> {
  return {
    documentId: candidate.documentId,
    documentType: candidate.documentType,
    employeeId: candidate.employeeId,
    title: candidate.title,
    effectiveTo: candidate.effectiveTo.toISOString(),
    daysToExpiry: candidate.daysToExpiry,
    severityTier: tier,
    tierThresholdDays: DOCUMENT_EXPIRY_TIER_THRESHOLD_DAYS[tier],
    trigger: "cron:hrm-document-expiry-watch",
  }
}

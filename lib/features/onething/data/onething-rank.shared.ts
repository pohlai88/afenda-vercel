import type { OneThingSeverity } from "../constants"
import type { OneThingRow } from "../types"

/**
 * Deterministic ranker for the operational atom canvas.
 *
 * Takes hydrated onething for one user/org context and returns the single
 * most-unblocking thing as `canvas`, the next handful as `tail`, and a literal
 * `whyNow` sentence explaining the canvas pick. The ranker is intentionally
 * a pure function:
 *
 * - no clock reads inside the algorithm — `now` is injected at the boundary
 * - no LLM calls — `whyNow` is verbalised from the strongest contributing signal
 * - no DB reads — feed it pre-hydrated rows
 *
 * The shape is stable so tests can assert against frozen scenarios. Trading
 * vocabulary is intentionally absent: the canvas is "the next unblocking
 * thing", never a "trade".
 */

const SEVERITY_WEIGHTS: Record<OneThingSeverity, number> = {
  critical: 30,
  high: 20,
  medium: 6,
  low: 0,
}

const PROVENANCE_BOOSTS: Record<
  NonNullable<OneThingRow["provenance"]>["kind"],
  number
> = {
  lynx: 6,
  approval: 4,
  person: 2,
  system: 2,
  cron: 0,
  import: 0,
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** SLA / due bucket scoring — sharper as the window collapses. */
function timeUrgency(msUntil: number | undefined | null): number {
  if (msUntil == null) return 0
  if (msUntil < 0) return 100
  if (msUntil < HOUR_MS) return 80
  if (msUntil < 4 * HOUR_MS) return 60
  if (msUntil < DAY_MS) return 30
  if (msUntil < 3 * DAY_MS) return 10
  return 0
}

/** $1K → 18, $10K → 24, $100K → 30 — a flat-ish lift; prevents one big number drowning the rest. */
function slipCostScore(usd: number | undefined | null): number {
  if (usd == null || !Number.isFinite(usd) || usd <= 0) return 0
  return Math.min(36, Math.log10(usd + 1) * 6)
}

function clampUnblocks(n: number | undefined | null): number {
  if (n == null || !Number.isFinite(n) || n <= 0) return 0
  return Math.min(50, Math.floor(n))
}

/** Shared with onething canvas pages — focus drill-down and ranker use the same gate. */
export const ONETHING_CANVAS_ACTIVE_STATE_SET = new Set<string>([
  "detected",
  "owned",
  "blocked",
  "resolving",
  "ready_to_release",
])

/** Stable ordering key — used for tie-breaks; createdAt asc then id asc. */
function tieBreak(a: OneThingRow, b: OneThingRow): number {
  const at = a.createdAt.getTime()
  const bt = b.createdAt.getTime()
  if (at !== bt) return at - bt
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

export type RankedOneThing = OneThingRow & {
  /** Total numeric score (higher = more unblocking). Stable for a given `now`. */
  rankScore: number
}

/**
 * Compute the rank score for a single hydrated onething against `now`.
 * Exported so the canvas/tail components can render the same number when
 * surfacing "why" without recomputing the entire batch.
 */
export function computeOneThingRankScore(
  onething: OneThingRow,
  now: Date
): number {
  if (!ONETHING_CANVAS_ACTIVE_STATE_SET.has(onething.state)) return -1

  let score = 0

  // Impact.unblocks — direct signal of how much downstream work this releases.
  score += 12 * clampUnblocks(onething.impact?.unblocks)

  // Slip cost — log-scaled so $10K and $100K don't differ by 10x in rank.
  score += slipCostScore(onething.impact?.slipCostUsd)

  // SLA horizon — explicit if provided.
  score += timeUrgency(onething.impact?.slaHorizonMs)

  // dueAt urgency — fallback when impact.slaHorizonMs is absent.
  if (onething.impact?.slaHorizonMs == null && onething.dueAt) {
    score += timeUrgency(onething.dueAt.getTime() - now.getTime())
  }

  // Cast is intentional: the DB column is `string` but we expect OneThingSeverity values.
  score += SEVERITY_WEIGHTS[onething.severity as OneThingSeverity] ?? 0

  // Provenance boost — system-flagged work usually means "look at this now".
  if (onething.provenance) {
    score += PROVENANCE_BOOSTS[onething.provenance.kind] ?? 0
  }

  // Gate-blocking lift — period close, posting, etc. are operationally hard stops.
  if (onething.impact?.blocksGate) {
    score += 14
  }

  // OneThing state lift — detected/blocked surface ahead of calm owned rows.
  if (onething.state === "detected") score += 8
  else if (onething.state === "blocked") score += 6
  else if (onething.state === "resolving") score += 2
  else if (onething.state === "ready_to_release") score += 10

  // Critical prediction not yet accepted — strong attention signal.
  const preds = onething.predictions ?? []
  if (
    preds.some(
      (p) => p.severity === "critical" && !p.acceptedByUserId && !p.clearedAt
    )
  ) {
    score += 20
  }

  return score
}

/** Compact human duration: 28m, 2h 14m, 3d 4h. */
export function formatHorizon(msUntil: number): string {
  const abs = Math.abs(msUntil)
  if (abs < 60_000) return "less than 1m"
  if (abs < HOUR_MS) {
    const m = Math.round(abs / 60_000)
    return `${m}m`
  }
  if (abs < DAY_MS) {
    const h = Math.floor(abs / HOUR_MS)
    const m = Math.round((abs - h * HOUR_MS) / 60_000)
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }
  const d = Math.floor(abs / DAY_MS)
  const h = Math.round((abs - d * DAY_MS) / HOUR_MS)
  return h === 0 ? `${d}d` : `${d}d ${h}h`
}

function formatUsd(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`
  return `$${Math.round(usd)}`
}

/**
 * Build the literal `why-now` sentence for the canvas. Always one short
 * sentence; never speculation. Picks the strongest reason from the row's
 * actual signals so users can audit the explanation against the data.
 */
export function buildWhyNow(canvas: OneThingRow, now: Date): string {
  const unblocks = clampUnblocks(canvas.impact?.unblocks)
  const slaMs =
    canvas.impact?.slaHorizonMs ??
    (canvas.dueAt ? canvas.dueAt.getTime() - now.getTime() : null)
  const slipUsd = canvas.impact?.slipCostUsd ?? null
  const provKind = canvas.provenance?.kind
  const gate = canvas.impact?.blocksGate

  if (unblocks >= 2 && slaMs != null && slaMs < 4 * HOUR_MS) {
    return `first because resolving it unblocks ${unblocks} other consequences and an SLA in ${formatHorizon(slaMs)}`
  }
  if (unblocks >= 2) {
    return `first because resolving it unblocks ${unblocks} other consequences`
  }
  if (gate && slaMs != null && slaMs < DAY_MS) {
    return `first because it blocks ${gate} in ${formatHorizon(slaMs)}`
  }
  if (slaMs != null && slaMs < 4 * HOUR_MS) {
    return slaMs < 0
      ? `first because the SLA window is already past`
      : `first because the SLA window is ${formatHorizon(slaMs)}`
  }
  if (slipUsd != null && slipUsd >= 1000) {
    return `first because slip cost is ~${formatUsd(slipUsd)}`
  }
  if (gate) {
    return `first because it blocks ${gate}`
  }
  if (provKind === "lynx") {
    const note = canvas.provenance?.note
    return note
      ? `first because Lynx flagged it · ${note}`
      : `first because Lynx flagged it`
  }
  if (slaMs != null && slaMs < DAY_MS) {
    return slaMs < 0
      ? `first because it is overdue`
      : `first because it is due in ${formatHorizon(slaMs)}`
  }
  if (canvas.severity === "critical") {
    return `first because severity is critical`
  }
  if (provKind === "approval") {
    return `first because it is waiting on your approval`
  }
  return `first because it is the most unblocking thing in your queue`
}

/**
 * Stage-1 ranking entrypoint. Returns the canvas pick, the next slice of
 * the queue (default 6), and the verbalised why-now sentence.
 *
 * Pure: same `now` + same input rows ⇒ same output.
 */
export function rankOneThingForCanvas(
  onething: readonly OneThingRow[],
  options?: { now?: Date; tailLimit?: number }
): {
  canvas: OneThingRow | null
  tail: OneThingRow[]
  whyNow: string
  ranked: RankedOneThing[]
} {
  const now = options?.now ?? new Date()
  const tailLimit = options?.tailLimit ?? 6

  const ranked: RankedOneThing[] = onething
    .filter((t) => ONETHING_CANVAS_ACTIVE_STATE_SET.has(t.state))
    .map((t) => ({ ...t, rankScore: computeOneThingRankScore(t, now) }))
    .sort((a, b) => {
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore
      return tieBreak(a, b)
    })

  const canvas = ranked[0] ?? null
  const tail = ranked.slice(1, 1 + tailLimit)
  const whyNow = canvas
    ? buildWhyNow(canvas, now)
    : "nothing in your queue right now"

  return { canvas: canvas ?? null, tail, whyNow, ranked }
}

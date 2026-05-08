import type { TodoRow } from "../types"

/**
 * Deterministic ranker for the operational atom canvas.
 *
 * Takes hydrated todos for one user/org context and returns the single
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

const PRIORITY_WEIGHTS: Record<string, number> = {
  urgent: 30,
  high: 18,
  normal: 6,
  low: 0,
}

const PROVENANCE_BOOSTS: Record<NonNullable<TodoRow["provenance"]>["kind"], number> = {
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

/** Shared with todo canvas pages — focus drill-down and ranker use the same gate. */
export const TODO_CANVAS_ACTIVE_STATE_SET = new Set<string>([
  "pending",
  "in_progress",
])

/** Stable ordering key — used for tie-breaks; createdAt asc then id asc. */
function tieBreak(a: TodoRow, b: TodoRow): number {
  const at = a.createdAt.getTime()
  const bt = b.createdAt.getTime()
  if (at !== bt) return at - bt
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

export type RankedTodo = TodoRow & {
  /** Total numeric score (higher = more unblocking). Stable for a given `now`. */
  rankScore: number
}

/**
 * Compute the rank score for a single hydrated todo against `now`.
 * Exported so the canvas/tail components can render the same number when
 * surfacing "why" without recomputing the entire batch.
 */
export function computeTodoRankScore(todo: TodoRow, now: Date): number {
  if (!TODO_CANVAS_ACTIVE_STATE_SET.has(todo.state)) return -1

  let score = 0

  // Impact.unblocks — direct signal of how much downstream work this releases.
  score += 12 * clampUnblocks(todo.impact?.unblocks)

  // Slip cost — log-scaled so $10K and $100K don't differ by 10x in rank.
  score += slipCostScore(todo.impact?.slipCostUsd)

  // SLA horizon — explicit if provided.
  score += timeUrgency(todo.impact?.slaHorizonMs)

  // dueAt urgency — fallback when impact.slaHorizonMs is absent.
  if (todo.impact?.slaHorizonMs == null && todo.dueAt) {
    score += timeUrgency(todo.dueAt.getTime() - now.getTime())
  }

  // Priority weight.
  score += PRIORITY_WEIGHTS[todo.priority] ?? 0

  // Provenance boost — system-flagged work usually means "look at this now".
  if (todo.provenance) {
    score += PROVENANCE_BOOSTS[todo.provenance.kind] ?? 0
  }

  // Gate-blocking lift — period close, posting, etc. are operationally hard stops.
  if (todo.impact?.blocksGate) {
    score += 14
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
export function buildWhyNow(canvas: TodoRow, now: Date): string {
  const unblocks = clampUnblocks(canvas.impact?.unblocks)
  const slaMs =
    canvas.impact?.slaHorizonMs ??
    (canvas.dueAt ? canvas.dueAt.getTime() - now.getTime() : null)
  const slipUsd = canvas.impact?.slipCostUsd ?? null
  const provKind = canvas.provenance?.kind
  const gate = canvas.impact?.blocksGate

  if (unblocks >= 2 && slaMs != null && slaMs < 4 * HOUR_MS) {
    return `first because completing it unblocks ${unblocks} other tasks and an SLA in ${formatHorizon(slaMs)}`
  }
  if (unblocks >= 2) {
    return `first because completing it unblocks ${unblocks} other tasks`
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
  if (canvas.priority === "urgent") {
    return `first because it is marked urgent`
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
export function rankTodosForCanvas(
  todos: readonly TodoRow[],
  options?: { now?: Date; tailLimit?: number }
): {
  canvas: TodoRow | null
  tail: TodoRow[]
  whyNow: string
  ranked: RankedTodo[]
} {
  const now = options?.now ?? new Date()
  const tailLimit = options?.tailLimit ?? 6

  const ranked: RankedTodo[] = todos
    .filter((t) => TODO_CANVAS_ACTIVE_STATE_SET.has(t.state))
    .map((t) => ({ ...t, rankScore: computeTodoRankScore(t, now) }))
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

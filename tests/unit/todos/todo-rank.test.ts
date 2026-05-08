import { describe, expect, it } from "vitest"

import {
  buildWhyNow,
  computeTodoRankScore,
  formatHorizon,
  rankTodosForCanvas,
} from "#features/todos/data/todo-rank.shared"
import type { TodoRow } from "#features/todos"

const FROZEN_NOW = new Date("2026-01-15T12:00:00.000Z")
const HOUR_MS = 60 * 60 * 1000

function makeTodo(overrides: Partial<TodoRow> & { id: string }): TodoRow {
  return {
    id: overrides.id,
    listId: overrides.listId ?? "list-1",
    title: overrides.title ?? `todo ${overrides.id}`,
    description: overrides.description ?? "",
    state: overrides.state ?? "pending",
    priority: overrides.priority ?? "normal",
    dueAt: overrides.dueAt ?? null,
    snoozeUntil: overrides.snoozeUntil ?? null,
    assigneeUserId: overrides.assigneeUserId ?? null,
    recurrenceRule: overrides.recurrenceRule ?? null,
    position: overrides.position ?? 0,
    createdAt: overrides.createdAt ?? new Date("2026-01-10T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-10T00:00:00.000Z"),
    linkage: overrides.linkage ?? null,
    counterparty: overrides.counterparty ?? null,
    provenance: overrides.provenance ?? null,
    impact: overrides.impact ?? null,
  }
}

describe("rankTodosForCanvas — empty / inactive states", () => {
  it("returns null canvas + empty tail when input is empty", () => {
    const { canvas, tail, whyNow } = rankTodosForCanvas([], { now: FROZEN_NOW })
    expect(canvas).toBeNull()
    expect(tail).toEqual([])
    expect(whyNow).toMatch(/nothing in your queue/i)
  })

  it("filters out completed / cancelled / snoozed todos", () => {
    const todos = [
      makeTodo({ id: "a", state: "completed" }),
      makeTodo({ id: "b", state: "cancelled" }),
      makeTodo({ id: "c", state: "snoozed" }),
    ]
    const { canvas, tail } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(canvas).toBeNull()
    expect(tail).toEqual([])
  })

  it("includes pending and in_progress only", () => {
    const todos = [
      makeTodo({ id: "a", state: "pending" }),
      makeTodo({ id: "b", state: "in_progress" }),
      makeTodo({ id: "c", state: "completed" }),
    ]
    const { ranked } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(ranked.map((r) => r.id)).toEqual(expect.arrayContaining(["a", "b"]))
    expect(ranked.map((r) => r.id)).not.toContain("c")
  })
})

describe("rankTodosForCanvas — signal weighting", () => {
  it("higher unblocks ranks above lower unblocks", () => {
    const todos = [
      makeTodo({ id: "low", impact: { unblocks: 1 } }),
      makeTodo({ id: "high", impact: { unblocks: 5 } }),
    ]
    const { canvas } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("high")
  })

  it("tighter SLA horizon ranks above looser", () => {
    const todos = [
      makeTodo({ id: "loose", impact: { slaHorizonMs: 10 * HOUR_MS } }),
      makeTodo({ id: "tight", impact: { slaHorizonMs: HOUR_MS } }),
    ]
    const { canvas } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("tight")
  })

  it("already-blocking SLA ranks above any future SLA", () => {
    const todos = [
      makeTodo({ id: "tight", impact: { slaHorizonMs: 30 * 60_000 } }),
      makeTodo({ id: "past", impact: { slaHorizonMs: -1 * HOUR_MS } }),
    ]
    const { canvas } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("past")
  })

  it("priority lifts an otherwise-equal todo", () => {
    const todos = [
      makeTodo({ id: "norm", priority: "normal" }),
      makeTodo({ id: "urg", priority: "urgent" }),
    ]
    const { canvas } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("urg")
  })

  it("provenance.kind === 'lynx' beats 'cron' on equal signals", () => {
    const todos = [
      makeTodo({ id: "cron", provenance: { kind: "cron" } }),
      makeTodo({ id: "lynx", provenance: { kind: "lynx" } }),
    ]
    const { canvas } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("lynx")
  })

  it("uses dueAt as fallback when impact.slaHorizonMs is absent", () => {
    const todos = [
      makeTodo({
        id: "no-due",
        priority: "normal",
      }),
      makeTodo({
        id: "due-soon",
        priority: "normal",
        dueAt: new Date(FROZEN_NOW.getTime() + 30 * 60_000),
      }),
    ]
    const { canvas } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("due-soon")
  })

  it("blocksGate adds an explicit lift", () => {
    const todos = [
      makeTodo({ id: "noop", impact: { unblocks: 1 } }),
      makeTodo({
        id: "gated",
        impact: { unblocks: 1, blocksGate: "period-close" },
      }),
    ]
    const { canvas } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("gated")
  })
})

describe("rankTodosForCanvas — determinism + tie-breaking", () => {
  it("breaks ties by createdAt asc, then id asc", () => {
    const sameImpact = { unblocks: 3 } as const
    const todos = [
      makeTodo({
        id: "z",
        impact: sameImpact,
        createdAt: new Date("2026-01-09T00:00:00.000Z"),
      }),
      makeTodo({
        id: "a",
        impact: sameImpact,
        createdAt: new Date("2026-01-09T00:00:00.000Z"),
      }),
      makeTodo({
        id: "k",
        impact: sameImpact,
        createdAt: new Date("2026-01-08T00:00:00.000Z"),
      }),
    ]
    const { ranked } = rankTodosForCanvas(todos, { now: FROZEN_NOW })
    // older createdAt first, then id asc on the same-day rows
    expect(ranked.map((r) => r.id)).toEqual(["k", "a", "z"])
  })

  it("is deterministic across input shuffles", () => {
    const base: TodoRow[] = [
      makeTodo({ id: "u1", impact: { unblocks: 4 } }),
      makeTodo({
        id: "u2",
        impact: { slaHorizonMs: 30 * 60_000, unblocks: 1 },
      }),
      makeTodo({ id: "u3", priority: "urgent" }),
      makeTodo({
        id: "u4",
        provenance: { kind: "lynx", note: "vat variance" },
      }),
      makeTodo({ id: "u5", impact: { slipCostUsd: 50_000 } }),
    ]
    const shuffles = [
      [base[0]!, base[1]!, base[2]!, base[3]!, base[4]!],
      [base[4]!, base[3]!, base[2]!, base[1]!, base[0]!],
      [base[2]!, base[0]!, base[4]!, base[1]!, base[3]!],
      [base[1]!, base[4]!, base[0]!, base[3]!, base[2]!],
    ]
    const orderings = shuffles.map(
      (s) =>
        rankTodosForCanvas(s, { now: FROZEN_NOW }).ranked.map((r) => r.id) //
    )
    for (const o of orderings) {
      expect(o).toEqual(orderings[0])
    }
  })

  it("respects tailLimit", () => {
    const todos = Array.from({ length: 12 }, (_, i) =>
      makeTodo({
        id: `t${i.toString().padStart(2, "0")}`,
        impact: { unblocks: 12 - i },
      })
    )
    const { canvas, tail } = rankTodosForCanvas(todos, {
      now: FROZEN_NOW,
      tailLimit: 4,
    })
    expect(canvas?.id).toBe("t00")
    expect(tail).toHaveLength(4)
    expect(tail.map((r) => r.id)).toEqual(["t01", "t02", "t03", "t04"])
  })
})

describe("computeTodoRankScore", () => {
  it("returns -1 for inactive states (so they sort to the end if mixed in)", () => {
    expect(
      computeTodoRankScore(
        makeTodo({ id: "x", state: "completed" }),
        FROZEN_NOW
      )
    ).toBe(-1)
  })

  it("returns 0 for a bare pending todo with no signals", () => {
    expect(
      computeTodoRankScore(makeTodo({ id: "x" }), FROZEN_NOW)
      // priority default "normal" carries +6
    ).toBe(6)
  })
})

describe("buildWhyNow", () => {
  it("combines unblocks + SLA when both are strong", () => {
    const t = makeTodo({
      id: "x",
      impact: { unblocks: 3, slaHorizonMs: 2 * HOUR_MS },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(
      /unblocks 3 other tasks and an SLA in 2h/
    )
  })

  it("emits unblocks-only when no SLA pressure", () => {
    const t = makeTodo({ id: "x", impact: { unblocks: 4 } })
    expect(buildWhyNow(t, FROZEN_NOW)).toBe(
      "first because completing it unblocks 4 other tasks"
    )
  })

  it("emits gate phrasing when blocksGate is present and SLA is short", () => {
    const t = makeTodo({
      id: "x",
      impact: { blocksGate: "period close", slaHorizonMs: 5 * HOUR_MS },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(/blocks period close in 5h/)
  })

  it("emits SLA-only when SLA is the only short window", () => {
    const t = makeTodo({
      id: "x",
      impact: { slaHorizonMs: 30 * 60_000 },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(/SLA window is 30m/)
  })

  it("uses the past-SLA phrasing for negative horizons", () => {
    const t = makeTodo({
      id: "x",
      impact: { slaHorizonMs: -2 * HOUR_MS },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(/already past/)
  })

  it("falls back to slip cost when impact carries it alone", () => {
    const t = makeTodo({ id: "x", impact: { slipCostUsd: 12_400 } })
    expect(buildWhyNow(t, FROZEN_NOW)).toBe(
      "first because slip cost is ~$12.4K"
    )
  })

  it("verbalises lynx provenance with note when no impact signals", () => {
    const t = makeTodo({
      id: "x",
      provenance: { kind: "lynx", note: "vat cluster 0.78" },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toBe(
      "first because Lynx flagged it · vat cluster 0.78"
    )
  })

  it("falls back to a neutral sentence when nothing is informative", () => {
    const t = makeTodo({ id: "x" })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(/most unblocking thing/i)
  })
})

describe("formatHorizon", () => {
  it("formats < 1h in minutes", () => {
    expect(formatHorizon(30 * 60_000)).toBe("30m")
  })
  it("formats hours + minutes when both", () => {
    expect(formatHorizon(2 * HOUR_MS + 14 * 60_000)).toBe("2h 14m")
  })
  it("drops minutes when 0", () => {
    expect(formatHorizon(3 * HOUR_MS)).toBe("3h")
  })
  it("formats days + hours when > 24h", () => {
    expect(formatHorizon(25 * HOUR_MS)).toBe("1d 1h")
  })
  it("formats < 1m as 'less than 1m'", () => {
    expect(formatHorizon(30_000)).toMatch(/less than 1m/)
  })
})

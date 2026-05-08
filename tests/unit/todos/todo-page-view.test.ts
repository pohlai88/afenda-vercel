import { describe, expect, it } from "vitest"

import {
  buildOrgTodoCaptureSeedParts,
  buildPersonalTodoCaptureSeedParts,
  parseTodoCanvasSearchParams,
  resolveTodoCanvasWithFocusOverride,
  sliceOperationalTodoTail,
  TODO_CAPTURE_RUN_PARAM_MAX_LEN,
} from "#features/todos/data/todo-page-view.shared"
import type { RankedTodo } from "#features/todos/data/todo-rank.shared"
import type { TodoRow } from "#features/todos"

function row(
  overrides: Partial<TodoRow> & { id: string; state?: TodoRow["state"] }
): TodoRow {
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

describe("parseTodoCanvasSearchParams", () => {
  it("parses focus and trims run with max length", () => {
    const longRun = "x".repeat(TODO_CAPTURE_RUN_PARAM_MAX_LEN + 50)
    const { focusId, runId } = parseTodoCanvasSearchParams({
      focus: "todo-1",
      run: longRun,
    })
    expect(focusId).toBe("todo-1")
    expect(runId?.length).toBe(TODO_CAPTURE_RUN_PARAM_MAX_LEN)
  })

  it("treats empty run as null", () => {
    expect(parseTodoCanvasSearchParams({ run: "   " }).runId).toBeNull()
  })
})

describe("resolveTodoCanvasWithFocusOverride", () => {
  const todos = [
    row({ id: "a", state: "pending" }),
    row({ id: "b", state: "completed" }),
  ]

  it("keeps ranked canvas when focus id missing", () => {
    const r = resolveTodoCanvasWithFocusOverride({
      todos,
      rankedCanvas: todos[0]!,
      rankedWhyNow: "rank why",
      focusId: null,
      focusWhyNowLabel: "focus why",
    })
    expect(r.canvas?.id).toBe("a")
    expect(r.whyNow).toBe("rank why")
  })

  it("overrides to active focus todo", () => {
    const r = resolveTodoCanvasWithFocusOverride({
      todos,
      rankedCanvas: todos[0]!,
      rankedWhyNow: "rank why",
      focusId: "a",
      focusWhyNowLabel: "opened",
    })
    expect(r.canvas?.id).toBe("a")
    expect(r.whyNow).toBe("opened")
  })

  it("ignores focus when state is not canvas-eligible", () => {
    const r = resolveTodoCanvasWithFocusOverride({
      todos,
      rankedCanvas: todos[0]!,
      rankedWhyNow: "rank why",
      focusId: "b",
      focusWhyNowLabel: "opened",
    })
    expect(r.canvas?.id).toBe("a")
    expect(r.whyNow).toBe("rank why")
  })
})

describe("sliceOperationalTodoTail", () => {
  it("excludes canvas id and respects limit", () => {
    const ranked: RankedTodo[] = [
      { ...row({ id: "1" }), rankScore: 3 },
      { ...row({ id: "2" }), rankScore: 2 },
      { ...row({ id: "3" }), rankScore: 1 },
    ]
    const tail = sliceOperationalTodoTail(ranked, "1", 2)
    expect(tail.map((t) => t.id)).toEqual(["2", "3"])
  })
})

describe("capture seed builders", () => {
  it("builds org linkage JSON", () => {
    const p = buildOrgTodoCaptureSeedParts({
      orgSlug: "acme",
      locale: "en",
      runId: "run-1",
    })
    expect(JSON.parse(p.linkageJson)).toMatchObject({
      owningModule: "TODO",
      runId: "run-1",
      entities: [{ module: "ORG", id: "acme", meta: "en" }],
    })
  })

  it("builds personal linkage JSON", () => {
    const p = buildPersonalTodoCaptureSeedParts({ locale: "en", runId: null })
    expect(JSON.parse(p.linkageJson)).toMatchObject({
      owningModule: "TODO",
      entities: [{ module: "SCOPE", id: "personal" }],
    })
  })
})

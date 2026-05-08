import type { TodoRow } from "../types"

import type { RankedTodo } from "./todo-rank.shared"
import { TODO_CANVAS_ACTIVE_STATE_SET } from "./todo-rank.shared"

/** Max length for optional `?run=` linkage query param (serialized into capture seed). */
export const TODO_CAPTURE_RUN_PARAM_MAX_LEN = 200

/** Operational tail row cap after excluding the current canvas atom. */
export const TODO_CANVAS_TAIL_LIMIT = 6

export function parseTodoCanvasSearchParams(
  params: Record<string, string | string[] | undefined>
): { focusId: string | null; runId: string | null } {
  const focusRaw = params.focus
  const focusId = typeof focusRaw === "string" ? focusRaw : null
  const runRaw = params.run
  const runId =
    typeof runRaw === "string" && runRaw.trim().length > 0
      ? runRaw.trim().slice(0, TODO_CAPTURE_RUN_PARAM_MAX_LEN)
      : null
  return { focusId, runId }
}

/**
 * When `?focus=` matches an active todo, surface it as the canvas and swap the
 * why-now line to a deterministic UX string (i18n supplied by the caller).
 */
export function resolveTodoCanvasWithFocusOverride(options: {
  todos: readonly TodoRow[]
  rankedCanvas: TodoRow | null
  rankedWhyNow: string
  focusId: string | null
  focusWhyNowLabel: string
}): { canvas: TodoRow | null; whyNow: string } {
  const { todos, rankedCanvas, rankedWhyNow, focusId, focusWhyNowLabel } =
    options
  if (!focusId) {
    return { canvas: rankedCanvas, whyNow: rankedWhyNow }
  }
  const focus = todos.find(
    (todo) =>
      todo.id === focusId && TODO_CANVAS_ACTIVE_STATE_SET.has(todo.state)
  )
  if (!focus) {
    return { canvas: rankedCanvas, whyNow: rankedWhyNow }
  }
  return { canvas: focus, whyNow: focusWhyNowLabel }
}

/** Tail queue for the right rail — ranked candidates minus the canvas row. */
export function sliceOperationalTodoTail(
  ranked: readonly RankedTodo[],
  canvasId: string | null,
  limit: number = TODO_CANVAS_TAIL_LIMIT
): RankedTodo[] {
  return ranked.filter((row) => row.id !== canvasId).slice(0, limit)
}

export function buildOrgTodoCaptureSeedParts(options: {
  orgSlug: string
  locale: string
  runId: string | null
}): { linkageJson: string; provenanceJson: string } {
  const { orgSlug, locale, runId } = options
  const linkagePayload = {
    owningModule: "TODO" as const,
    ...(runId ? { runId } : {}),
    entities: [
      {
        module: "ORG",
        id: orgSlug,
        label: orgSlug,
        meta: locale,
      },
    ],
  }
  return {
    linkageJson: JSON.stringify(linkagePayload),
    provenanceJson: JSON.stringify({
      kind: "person",
      source: "todo-canvas",
    }),
  }
}

export function buildPersonalTodoCaptureSeedParts(options: {
  locale: string
  runId: string | null
}): { linkageJson: string; provenanceJson: string } {
  const { locale, runId } = options
  const linkagePayload = {
    owningModule: "TODO" as const,
    ...(runId ? { runId } : {}),
    entities: [
      {
        module: "SCOPE",
        id: "personal",
        label: "personal",
        meta: locale,
      },
    ],
  }
  return {
    linkageJson: JSON.stringify(linkagePayload),
    provenanceJson: JSON.stringify({
      kind: "person",
      source: "todo-canvas",
    }),
  }
}

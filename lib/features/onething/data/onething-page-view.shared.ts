import type { OneThingRow } from "../types"

import type { RankedOneThing } from "./onething-rank.shared"
import { ONETHING_CANVAS_ACTIVE_STATE_SET } from "./onething-rank.shared"

/** Max length for optional `?run=` linkage query param (serialized into capture seed). */
export const ONETHING_CAPTURE_RUN_PARAM_MAX_LEN = 200

/** Operational tail row cap after excluding the current canvas atom. */
export const ONETHING_CANVAS_TAIL_LIMIT = 6

/** Same shape as App Router `searchParams` — tail links preserve keys like `run`. */
export type OneThingTailPreserveSearchParams = Record<
  string,
  string | string[] | undefined
>

export function buildTailFocusHref(
  pathname: string,
  focusId: string,
  preserve: OneThingTailPreserveSearchParams | undefined
): string {
  const sp = new URLSearchParams()
  if (preserve) {
    for (const [key, raw] of Object.entries(preserve)) {
      if (key === "focus") continue
      if (raw === undefined) continue
      const values = Array.isArray(raw) ? raw : [raw]
      for (const v of values) {
        if (v !== "") sp.append(key, v)
      }
    }
  }
  sp.set("focus", focusId)
  return `${pathname}?${sp.toString()}`
}

export function parseOneThingCanvasSearchParams(
  params: Record<string, string | string[] | undefined>
): { focusId: string | null; runId: string | null } {
  const focusRaw = params.focus
  const focusId = typeof focusRaw === "string" ? focusRaw : null
  const runRaw = params.run
  const runId =
    typeof runRaw === "string" && runRaw.trim().length > 0
      ? runRaw.trim().slice(0, ONETHING_CAPTURE_RUN_PARAM_MAX_LEN)
      : null
  return { focusId, runId }
}

/**
 * When `?focus=` matches an active onething, surface it as the canvas and swap the
 * why-now line to a deterministic UX string (i18n supplied by the caller).
 */
export function resolveOneThingCanvasWithFocusOverride(options: {
  onething: readonly OneThingRow[]
  rankedCanvas: OneThingRow | null
  rankedWhyNow: string
  focusId: string | null
  focusWhyNowLabel: string
}): { canvas: OneThingRow | null; whyNow: string } {
  const { onething, rankedCanvas, rankedWhyNow, focusId, focusWhyNowLabel } =
    options
  if (!focusId) {
    return { canvas: rankedCanvas, whyNow: rankedWhyNow }
  }
  const focus = onething.find(
    (onething) =>
      onething.id === focusId &&
      ONETHING_CANVAS_ACTIVE_STATE_SET.has(onething.state)
  )
  if (!focus) {
    return { canvas: rankedCanvas, whyNow: rankedWhyNow }
  }
  return { canvas: focus, whyNow: focusWhyNowLabel }
}

/** Tail queue for the right rail — ranked candidates minus the canvas row. */
export function sliceOperationalOneThingTail(
  ranked: readonly RankedOneThing[],
  canvasId: string | null,
  limit: number = ONETHING_CANVAS_TAIL_LIMIT
): RankedOneThing[] {
  return ranked.filter((row) => row.id !== canvasId).slice(0, limit)
}

export function buildOrgOneThingCaptureSeedParts(options: {
  orgSlug: string
  locale: string
  runId: string | null
}): { linkageJson: string; provenanceJson: string } {
  const { orgSlug, locale, runId } = options
  const linkagePayload = {
    owningModule: "ONETHING" as const,
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
      source: "onething-canvas",
    }),
  }
}

export function buildPersonalOneThingCaptureSeedParts(options: {
  locale: string
  runId: string | null
}): { linkageJson: string; provenanceJson: string } {
  const { locale, runId } = options
  const linkagePayload = {
    owningModule: "ONETHING" as const,
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
      source: "onething-canvas",
    }),
  }
}

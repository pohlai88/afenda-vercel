import type { ListSurfaceRendererDataNature } from "./schemas/list-surface-renderer.schema"
import type { ListSurfaceRowTrailingAction } from "./schemas/list-surface-row-trailing-action.schema"

export type GovernedListSurfaceRenderState = "empty" | "ready"

export type GovernedListSurfaceTrailingSummary = {
  total: number
  hidden: number
  disabled: number
  ready: number
}

export type GovernedListSurfaceRenderLogFields = {
  surfaceKey: string
  columnsId: string
  dataNature: ListSurfaceRendererDataNature
  presentationVariant: string
  density: string
  state: GovernedListSurfaceRenderState
  rowCount: number
  trailing: GovernedListSurfaceTrailingSummary
}

/** Stable per-request dedupe key for `logGovernedListSurfaceRender`. */
export function buildGovernedListSurfaceRenderFingerprint(
  input: GovernedListSurfaceRenderLogFields
): string {
  return [
    input.surfaceKey,
    input.state,
    input.rowCount,
    input.columnsId,
    input.density,
    input.presentationVariant,
    input.trailing.hidden,
    input.trailing.disabled,
    input.trailing.ready,
  ].join("|")
}

export function governedListSectionTestId(surfaceKey: string): string {
  return `governed-list-section:${surfaceKey}`
}

export function governedListSurfaceTestId(surfaceKey: string): string {
  return `governed-list-surface:${surfaceKey}`
}

export function governedListRowTestId(surfaceKey: string, rowId: string): string {
  return `governed-list-row:${surfaceKey}:${rowId}`
}

export function summarizeListSurfaceTrailingActions(
  rows: readonly { trailingAction?: ListSurfaceRowTrailingAction }[]
): GovernedListSurfaceTrailingSummary {
  const summary: GovernedListSurfaceTrailingSummary = {
    total: rows.length,
    hidden: 0,
    disabled: 0,
    ready: 0,
  }

  for (const row of rows) {
    const state = row.trailingAction?.state
    if (state === "hidden") summary.hidden += 1
    else if (state === "disabled") summary.disabled += 1
    else if (state === "ready") summary.ready += 1
  }

  return summary
}

export type GovernedListSurfaceDataAttributes = {
  "data-governed-surface-key"?: string
  "data-governed-list-state"?: GovernedListSurfaceRenderState
  "data-governed-columns-id"?: string
  "data-governed-table-density"?: string
  "data-governed-data-nature"?: ListSurfaceRendererDataNature
  "data-governed-presentation-variant"?: string
}

export function buildGovernedListSurfaceDataAttributes(input: {
  surfaceKey?: string
  columnsId?: string
  dataNature?: ListSurfaceRendererDataNature
  presentationVariant?: string
  density?: string
  state: GovernedListSurfaceRenderState
}): GovernedListSurfaceDataAttributes {
  return {
    ...(input.surfaceKey
      ? { "data-governed-surface-key": input.surfaceKey }
      : {}),
    "data-governed-list-state": input.state,
    ...(input.columnsId
      ? { "data-governed-columns-id": input.columnsId }
      : {}),
    ...(input.density
      ? { "data-governed-table-density": input.density }
      : {}),
    ...(input.dataNature
      ? { "data-governed-data-nature": input.dataNature }
      : {}),
    ...(input.presentationVariant
      ? { "data-governed-presentation-variant": input.presentationVariant }
      : {}),
  }
}

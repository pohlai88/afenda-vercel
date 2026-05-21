import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

/**
 * Minimal table configuration for Pattern C embedded sections when the
 * backing query fails. Keeps renderer contracts valid without duplicating
 * inline metadata across every inbox/list section.
 */
export function buildEmbeddedListSurfaceErrorConfiguration(input: {
  columnsId: string
  emptyTitle: string
  firstColumn: { id: string; header: string }
}): ListSurfaceRendererConfigurationInput {
  const { columnsId, emptyTitle, firstColumn } = input

  return {
    dataNature: "table",
    surface: {
      header: { title: columnsId },
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: emptyTitle },
    },
    columns: [firstColumn],
    rows: [],
  }
}

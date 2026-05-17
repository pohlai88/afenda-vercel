import {
  ListSurfaceTable,
  type ListSurfaceTableProps,
  type ListSurfaceTableTrailingColumn,
} from "./renderers/list-surface-table"

export type { ListSurfaceTableTrailingColumn }

/**
 * Pattern C (ADR-0026): metadata-driven list body plus a trailing column for
 * non-serializable React nodes (e.g. Server Action forms in claim inboxes).
 *
 * Feature modules must import this wrapper — not `list-surface-table` directly.
 */
export function GovernedListSurfaceWithTrailingColumn(
  props: ListSurfaceTableProps
) {
  return <ListSurfaceTable {...props} />
}

/** Stable section test id for Pattern K kanban surfaces (Pattern C parity). */
export function governedKanbanSectionTestId(surfaceKey: string): string {
  return `governed-kanban-section:${surfaceKey}`
}

export function governedKanbanBoardTestId(surfaceKey: string): string {
  return `governed-kanban-board:${surfaceKey}`
}

export function governedKanbanCardTestId(
  surfaceKey: string,
  cardId: string
): string {
  return `governed-kanban-card:${surfaceKey}:${cardId}`
}

const DEFAULT_KANBAN_BOARD_TEST_ID = "governed-kanban-board" as const

export function resolveKanbanBoardDomProps(surfaceKey?: string): {
  "data-testid": string
  "data-governed-surface-key"?: string
} {
  if (!surfaceKey) {
    return { "data-testid": DEFAULT_KANBAN_BOARD_TEST_ID }
  }
  return {
    "data-testid": governedKanbanBoardTestId(surfaceKey),
    "data-governed-surface-key": surfaceKey,
  }
}

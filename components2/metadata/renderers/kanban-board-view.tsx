import type { ReactNode } from "react"

import type {
  GovernedKanbanBoardConfiguration,
  KanbanCard,
  KanbanCardTransitionAvailability,
} from "#features/governed-surface/schemas/kanban-board.schema"
import {
  GovernedKanbanTransitionHint,
  governedKanbanCardTestId,
  isKanbanCardTransitionRenderable,
  resolveKanbanBoardDomProps,
} from "#features/governed-surface/client"

import {
  groupCardsByColumn,
  KANBAN_DATA_NATURE_CLASS,
  kanbanGridClass,
  KanbanCardTile,
  KanbanColumnPanel,
  resolveKanbanColumns,
} from "./kanban-board-presentation"

export {
  groupCardsByColumn,
  KANBAN_DATA_NATURE_CLASS,
  kanbanGridClass,
  resolveKanbanColumns,
} from "./kanban-board-presentation"

export type KanbanBoardViewProps = {
  board: GovernedKanbanBoardConfiguration
  /** When set, board and cards use stable Playwright ids (`governed-kanban-board:{key}`). */
  surfaceKey?: string
  /** Server Actions / forms — required for `footer-actions` interaction mode. */
  renderCardFooter?: (card: KanbanCard) => ReactNode
}

export function KanbanBoardView({
  board,
  surfaceKey,
  renderCardFooter,
}: KanbanBoardViewProps) {
  const columns = resolveKanbanColumns(board)
  const cardsByColumn = groupCardsByColumn(board.cards)

  const boardDom = resolveKanbanBoardDomProps(surfaceKey)

  return (
    <section
      aria-label={board.copy.boardAriaLabel}
      className={KANBAN_DATA_NATURE_CLASS[board.dataNature]}
      {...boardDom}
      data-interaction-mode={board.interactionMode}
    >
      <div className={kanbanGridClass(columns.length)}>
        {columns.map((column) => {
          const cards = cardsByColumn.get(column.id) ?? []
          const headingId = `kanban-column-${column.id}-title`

          return (
            <KanbanColumnPanel
              key={column.id}
              column={column}
              cards={cards}
              headingId={headingId}
              emptyColumnLabel={board.copy.emptyColumn}
              renderCard={(card) => (
                <li
                  key={card.id}
                  data-testid={
                    surfaceKey
                      ? governedKanbanCardTestId(surfaceKey, card.id)
                      : undefined
                  }
                >
                  <KanbanCardTile
                    card={card}
                    footer={
                      <>
                        {board.interactionMode === "read-only" &&
                        card.availableTransitions?.length ? (
                          <KanbanTransitionHints
                            transitions={card.availableTransitions}
                          />
                        ) : null}
                        {board.interactionMode === "footer-actions" &&
                        renderCardFooter ? (
                          <div className="border-t border-border/60 pt-2">
                            {renderCardFooter(card)}
                          </div>
                        ) : null}
                      </>
                    }
                  />
                </li>
              )}
            />
          )
        })}
      </div>
    </section>
  )
}

function KanbanTransitionHints({
  transitions,
}: {
  transitions: readonly KanbanCardTransitionAvailability[]
}) {
  const visible = transitions.filter(isKanbanCardTransitionRenderable)
  if (visible.length === 0) return null

  return (
    <ul
      className="flex flex-wrap gap-1 border-t border-border/60 pt-2"
      aria-label="Allowed transitions"
    >
      {visible.map((transition) => (
        <li key={transition.transitionId}>
          <GovernedKanbanTransitionHint transition={transition} />
        </li>
      ))}
    </ul>
  )
}

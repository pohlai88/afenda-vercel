"use client"

import { useCallback, useState, type DragEvent } from "react"

import type {
  GovernedKanbanBoardConfiguration,
  KanbanCard,
} from "#features/governed-surface/schemas/kanban-board.schema"
import {
  buildKanbanCardMovePayload,
  governedKanbanCardTestId,
  isKanbanCardDraggable,
  resolveKanbanBoardDomProps,
  resolveKanbanCardDropState,
  type KanbanCardMovePayload,
} from "#features/governed-surface/client"

import {
  groupCardsByColumn,
  KANBAN_DATA_NATURE_CLASS,
  kanbanGridClass,
  KanbanCardTile,
  KanbanColumnPanel,
  resolveKanbanColumns,
} from "./kanban-board-presentation"

export type KanbanBoardDragViewProps = {
  board: GovernedKanbanBoardConfiguration
  surfaceKey?: string
  onCardMove: (payload: KanbanCardMovePayload) => void
  /** When true, suppresses new drags while a move is in flight. */
  isMovePending?: boolean
  pendingCardId?: string | null
}

type DragSession = {
  card: KanbanCard
} | null

export function KanbanBoardDragView({
  board,
  surfaceKey,
  onCardMove,
  isMovePending = false,
  pendingCardId = null,
}: KanbanBoardDragViewProps) {
  const [dragSession, setDragSession] = useState<DragSession>(null)
  const [hoverColumnId, setHoverColumnId] = useState<string | null>(null)

  const columns = resolveKanbanColumns(board)
  const cardsByColumn = groupCardsByColumn(board.cards)
  const dragHandleLabel = board.copy.dragHandleAriaLabel ?? "Move card"

  const endDrag = useCallback(() => {
    setDragSession(null)
    setHoverColumnId(null)
  }, [])

  function resolveColumnDropState(columnId: string) {
    if (!dragSession) return "none" as const
    return resolveKanbanCardDropState(
      dragSession.card,
      board.workflow,
      columnId
    )
  }

  function handleCardDragStart(event: DragEvent<HTMLLIElement>, card: KanbanCard) {
    if (isMovePending) {
      event.preventDefault()
      return
    }
    if (!isKanbanCardDraggable(card, board.workflow)) {
      event.preventDefault()
      return
    }
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", card.id)
    }
    setDragSession({ card })
  }

  function handleColumnDragOver(
    event: DragEvent<HTMLDivElement>,
    columnId: string
  ) {
    if (!dragSession) return
    const dropState = resolveKanbanCardDropState(
      dragSession.card,
      board.workflow,
      columnId
    )
    if (dropState === "forbidden") return
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect =
        dropState === "allowed" ? "move" : "none"
    }
    setHoverColumnId(columnId)
  }

  function handleColumnDrop(
    event: DragEvent<HTMLDivElement>,
    columnId: string
  ) {
    event.preventDefault()
    if (!dragSession) return

    const dropState = resolveKanbanCardDropState(
      dragSession.card,
      board.workflow,
      columnId
    )
    if (dropState !== "allowed") {
      endDrag()
      return
    }

    onCardMove(buildKanbanCardMovePayload(dragSession.card, columnId))
    endDrag()
  }

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
          const dropState =
            hoverColumnId === column.id
              ? resolveColumnDropState(column.id)
              : "none"

          return (
            <KanbanColumnPanel
              key={column.id}
              column={column}
              cards={cards}
              headingId={headingId}
              emptyColumnLabel={board.copy.emptyColumn}
              columnDropSurface={{
                dropState,
                onDragOver: (event) => handleColumnDragOver(event, column.id),
                onDrop: (event) => handleColumnDrop(event, column.id),
                onDragLeave: () => {
                  if (hoverColumnId === column.id) {
                    setHoverColumnId(null)
                  }
                },
              }}
              renderCard={(card) => {
                const draggable =
                  !isMovePending &&
                  isKanbanCardDraggable(card, board.workflow)
                const isDragging =
                  dragSession?.card.id === card.id ||
                  pendingCardId === card.id

                return (
                  <li
                    key={card.id}
                    data-testid={
                      surfaceKey
                        ? governedKanbanCardTestId(surfaceKey, card.id)
                        : undefined
                    }
                    draggable={draggable}
                    onDragStart={(event) => handleCardDragStart(event, card)}
                    onDragEnd={endDrag}
                    aria-grabbed={isDragging ? true : undefined}
                    aria-label={
                      draggable
                        ? `${dragHandleLabel}: ${card.title}`
                        : undefined
                    }
                    data-kanban-card-draggable={draggable ? "true" : "false"}
                  >
                    <KanbanCardTile
                      card={card}
                      cardSurface={{
                        isDragging,
                      }}
                    />
                  </li>
                )
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

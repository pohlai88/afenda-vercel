import type { DragEvent, ReactNode } from "react"

import { Badge } from "#components2/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "#components2/ui/card"
import type {
  GovernedKanbanBoardConfiguration,
  KanbanBadgeTone,
  KanbanBoardDataNature,
  KanbanCard,
  KanbanColumn,
} from "#features/governed-surface/schemas/kanban-board.schema"
import type { KanbanCardDropState } from "#features/governed-surface"
import { GovernedEmpty } from "#features/governed-surface/client"
import { cn } from "#lib/utils"

export const KANBAN_DATA_NATURE_CLASS: Record<KanbanBoardDataNature, string> = {
  kanban: "@container flex flex-col gap-3",
}

const COLUMN_BADGE_VARIANT: Record<
  KanbanBadgeTone,
  "default" | "secondary" | "outline" | "destructive"
> = {
  default: "secondary",
  positive: "default",
  attention: "outline",
  critical: "destructive",
}

export const KANBAN_GRID_CLASS_DEFAULT =
  "grid grid-cols-1 gap-3 @sm:grid-cols-2 @3xl:grid-cols-4"

export const KANBAN_GRID_CLASS_WIDE =
  "grid grid-cols-1 gap-3 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 @3xl:grid-cols-6"

export function kanbanGridClass(columnCount: number): string {
  return columnCount >= 6 ? KANBAN_GRID_CLASS_WIDE : KANBAN_GRID_CLASS_DEFAULT
}

export function resolveKanbanColumns(
  board: GovernedKanbanBoardConfiguration
): KanbanColumn[] {
  const byId = new Map(board.columns.map((column) => [column.id, column]))

  if (board.columnOrder?.length) {
    return board.columnOrder
      .map((id) => byId.get(id))
      .filter((column): column is KanbanColumn => column !== undefined)
  }

  return board.columns
}

export function groupCardsByColumn(cards: KanbanCard[]) {
  const map = new Map<string, KanbanCard[]>()

  for (const card of cards) {
    const list = map.get(card.columnId) ?? []
    list.push(card)
    map.set(card.columnId, list)
  }

  return map
}

export type KanbanColumnDropSurfaceProps = {
  dropState?: KanbanCardDropState | "none"
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave?: (event: DragEvent<HTMLDivElement>) => void
}

export type KanbanCardSurfaceProps = {
  draggable?: boolean
  isDragging?: boolean
  onDragStart?: (event: DragEvent<HTMLLIElement>) => void
  onDragEnd?: (event: DragEvent<HTMLLIElement>) => void
  dragHandleAriaLabel?: string
}

export function KanbanColumnPanel({
  column,
  cards,
  headingId,
  emptyColumnLabel,
  renderCard,
  columnDropSurface,
}: {
  column: KanbanColumn
  cards: KanbanCard[]
  headingId: string
  emptyColumnLabel: string
  renderCard: (card: KanbanCard) => ReactNode
  columnDropSurface?: KanbanColumnDropSurfaceProps
}) {
  const columnAriaLabel = `${column.label}, ${cards.length}`
  const dropState = columnDropSurface?.dropState ?? "none"

  return (
    <Card
      className={cn(
        "flex min-h-40 flex-col transition-colors",
        dropState === "allowed" && "ring-2 ring-primary/40",
        dropState === "disabled" && "ring-2 ring-muted-foreground/25"
      )}
      role="region"
      aria-label={columnAriaLabel}
      data-kanban-drop-state={dropState}
      onDragOver={columnDropSurface?.onDragOver}
      onDrop={columnDropSurface?.onDrop}
      onDragLeave={columnDropSurface?.onDragLeave}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle id={headingId} className="text-sm font-medium">
          {column.label}
        </CardTitle>
        {column.badgeTone ? (
          <Badge
            variant={COLUMN_BADGE_VARIANT[column.badgeTone]}
            aria-hidden="true"
          >
            {cards.length}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            {cards.length}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 pt-0">
        {cards.length === 0 ? (
          <KanbanEmptyColumn label={emptyColumnLabel} />
        ) : (
          <ul
            className="flex max-h-96 flex-col gap-2 overflow-y-auto"
            aria-labelledby={headingId}
          >
            {cards.map((card) => renderCard(card))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function KanbanEmptyColumn({ label }: { label: string }) {
  return (
    <GovernedEmpty
      model={{ variant: "muted", title: label }}
      className={cn("border-0 bg-transparent p-4 @sm:p-4")}
    />
  )
}

export function KanbanCardTile({
  card,
  footer,
  cardSurface,
}: {
  card: KanbanCard
  footer?: ReactNode
  cardSurface?: KanbanCardSurfaceProps
}) {
  const titleId = `kanban-card-${card.id}-title`

  return (
    <Card
      size="sm"
      className={cn(
        "border-border/80 shadow-none",
        cardSurface?.isDragging && "opacity-50"
      )}
    >
      <CardContent className="flex flex-col gap-2">
        <article aria-labelledby={titleId}>
          <div className="flex flex-col gap-0.5">
            <p id={titleId} className="text-sm leading-snug font-medium">
              {card.title}
            </p>
            {card.subtitle ? (
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            ) : null}
          </div>
          {card.badges?.length ? (
            <ul className="mt-2 flex flex-wrap gap-1" aria-label="Status">
              {card.badges.map((badge) => (
                <li key={badge}>
                  <Badge variant="outline" className="text-xs">
                    {badge}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
        {footer}
      </CardContent>
    </Card>
  )
}

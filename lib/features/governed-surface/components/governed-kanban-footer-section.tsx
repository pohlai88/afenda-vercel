import "server-only"

import type { ReactNode } from "react"

import { cn } from "#lib/utils"

import type { EmptyState } from "../schemas/list-surface.schema"
import { governedKanbanSectionTestId } from "../kanban-surface-identity.shared"

import { GovernedEmpty } from "./governed-empty"

export type GovernedKanbanFooterSectionLayout = "embedded" | "titled"

export type GovernedKanbanFooterSectionProps = {
  surfaceKey: string
  title: string
  description?: string
  /** Defaults to `governedKanbanSectionTestId(surfaceKey)`. */
  sectionTestId?: string
  layout?: GovernedKanbanFooterSectionLayout
  headerSlot?: ReactNode
  /** Query failure — renders error empty state instead of the board bridge. */
  loadError?: EmptyState
  children: ReactNode
  className?: string
  contentClassName?: string
}

const TITLED_HEADING_CLASS =
  "mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase"

/**
 * RSC section shell for Pattern K kanban boards (`footer-actions` or `drag-reorder`).
 * Domain modules pass `GovernedKanbanFooterBoard`, `GovernedKanbanDragBoard`, or
 * `KanbanBoardView` (read-only) as children.
 */
export function GovernedKanbanFooterSection({
  surfaceKey,
  title,
  description,
  sectionTestId,
  layout = "titled",
  headerSlot,
  loadError,
  children,
  className,
  contentClassName,
}: GovernedKanbanFooterSectionProps) {
  const testId = sectionTestId ?? governedKanbanSectionTestId(surfaceKey)
  const headingId = `governed-kanban-section-${surfaceKey.replace(/:/g, "-")}-title`
  const boardSlot = loadError ? (
    <GovernedEmpty model={loadError} />
  ) : (
    children
  )

  if (layout === "embedded") {
    return (
      <div className={className} data-testid={testId}>
        {headerSlot}
        <div className={contentClassName}>{boardSlot}</div>
      </div>
    )
  }

  return (
    <section
      className={className}
      data-testid={testId}
      aria-labelledby={headingId}
    >
      {headerSlot}
      <h2 id={headingId} className={TITLED_HEADING_CLASS}>
        {title}
      </h2>
      {description ? (
        <p className={cn("mb-3 text-sm text-muted-foreground", contentClassName)}>
          {description}
        </p>
      ) : null}
      <div className={description ? undefined : contentClassName}>{boardSlot}</div>
    </section>
  )
}

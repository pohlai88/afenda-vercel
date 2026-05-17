import { Skeleton } from "#components2/ui/skeleton"

import type { AfendaGovernedRendererId } from "./registry"

export type GovernedComponentSkeletonProps = {
  rendererId: AfendaGovernedRendererId
}

function assertNever(value: never): never {
  throw new Error(`Unhandled governed renderer skeleton: ${value}`)
}

export function GovernedComponentSkeleton({
  rendererId,
}: GovernedComponentSkeletonProps) {
  switch (rendererId) {
    case "stat-card":
      return (
        <section
          className="@container"
          aria-hidden="true"
          data-testid="governed-skeleton-stat-card"
        >
          <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        </section>
      )

    case "list-surface":
      return (
        <div
          className="flex flex-col gap-3"
          aria-hidden="true"
          data-testid="governed-skeleton-list-surface"
        >
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )

    case "section":
      return (
        <div
          className="flex flex-col gap-4"
          aria-hidden="true"
          data-testid="governed-skeleton-section"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      )

    case "stack":
      return (
        <div
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          aria-hidden="true"
          data-testid="governed-skeleton-stack"
        >
          <Skeleton className="h-28 min-w-0 flex-1 rounded-xl sm:min-w-[12rem]" />
          <Skeleton className="h-28 min-w-0 flex-1 rounded-xl sm:min-w-[12rem]" />
        </div>
      )

    case "action-bar":
      return (
        <div
          className="flex flex-wrap gap-2"
          aria-hidden="true"
          data-testid="governed-skeleton-action-bar"
        >
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      )

    case "audit-panel":
    case "detail-tabs":
      return (
        <div
          className="flex flex-col gap-3"
          aria-hidden="true"
          data-testid={`governed-skeleton-${rendererId}`}
        >
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      )

    case "approval-timeline":
      return (
        <div
          className="flex flex-col gap-3"
          aria-hidden="true"
          data-testid="governed-skeleton-approval-timeline"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )

    case "chart":
      return (
        <div
          className="flex flex-col gap-3"
          aria-hidden="true"
          data-testid="governed-skeleton-chart"
        >
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )

    case "kanban-board":
      return (
        <section
          className="@container"
          aria-hidden="true"
          data-testid="governed-skeleton-kanban-board"
        >
          <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @3xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-xl" />
            ))}
          </div>
        </section>
      )

    case "multi-step-form":
    case "scorecard-form":
      return (
        <div
          className="flex flex-col gap-3"
          aria-hidden="true"
          data-testid={`governed-skeleton-${rendererId}`}
        >
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )

    case "empty":
      return (
        <Skeleton
          className="h-16 w-full rounded-xl"
          aria-hidden="true"
          data-testid="governed-skeleton-empty"
        />
      )
  }

  return assertNever(rendererId)
}

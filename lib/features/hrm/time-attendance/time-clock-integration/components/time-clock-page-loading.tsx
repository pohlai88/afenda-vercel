import { GovernedComponentSkeleton } from "#components2/metadata"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Skeleton } from "#components2/ui/skeleton"

const KPI_STAT_KEYS = [
  "active-devices",
  "active-mappings",
  "pending-exceptions",
  "failed-sync",
  "punches-today",
] as const

function ModulePageHeaderSkeleton() {
  return (
    <header className="flex flex-col gap-surface-xs" aria-hidden="true">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-full max-w-2xl" />
    </header>
  )
}

export function TimeClockKpiSectionSkeleton() {
  return (
    <Card size="sm" aria-hidden="true">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-5 w-24" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <section className="@container" data-testid="time-clock-loading-kpi">
          <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @2xl:grid-cols-5">
            {KPI_STAT_KEYS.map((key) => (
              <Skeleton key={key} className="h-24 rounded-xl" />
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

export function TimeClockListSectionSkeleton({
  withHeaderAction = false,
}: {
  readonly withHeaderAction?: boolean
}) {
  return (
    <Card
      size="sm"
      className="mt-6 border-solid border-border"
      aria-hidden="true"
    >
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-5 w-36" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-3 w-full max-w-xl" />
        </CardDescription>
        {withHeaderAction ? (
          <CardAction>
            <Skeleton className="h-8 w-32 rounded-md" />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <GovernedComponentSkeleton rendererId="list-surface" />
      </CardContent>
    </Card>
  )
}

function TimeClockReportSectionSkeleton() {
  return (
    <Card
      size="sm"
      className="mt-6 border-solid border-border"
      aria-hidden="true"
    >
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-5 w-40" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-3 w-full max-w-lg" />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-full max-w-md rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </CardContent>
    </Card>
  )
}

/**
 * Route `loading.tsx` skeleton — mirrors `TimeClockPage` section rhythm
 * (KPI → devices → mappings → sync batches → exceptions → report).
 */
export function TimeClockPageLoading() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-live="polite"
      data-testid="time-clock-page-loading"
    >
      <ModulePageHeaderSkeleton />
      <TimeClockKpiSectionSkeleton />
      <TimeClockListSectionSkeleton withHeaderAction />
      <TimeClockListSectionSkeleton withHeaderAction />
      <TimeClockListSectionSkeleton />
      <TimeClockListSectionSkeleton />
      <TimeClockReportSectionSkeleton />
    </div>
  )
}

export default TimeClockPageLoading

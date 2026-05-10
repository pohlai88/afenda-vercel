import { Skeleton } from "#components/ui/skeleton"

/** Instant loading UI while project list query streams (Next.js `loading.js` convention). */
export default function OrgDashboardIThinkListLoading() {
  return (
    <div className="flex min-h-[min(70vh,720px)] flex-1 flex-col gap-2 border border-border bg-card p-4">
      <Skeleton className="h-10 w-full max-w-xl" aria-hidden />
      <div className="mt-2 space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" aria-hidden />
        ))}
      </div>
    </div>
  )
}

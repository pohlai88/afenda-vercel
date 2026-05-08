import { AfendaBrandLockup } from "#components/afenda-brand"

/**
 * Suspense fallback for `/console` Tier B org list — mirrors page chrome without data.
 */
export default function ConsoleLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-16">
      <div className="w-full max-w-xl space-y-10">
        <div className="space-y-2">
          <AfendaBrandLockup className="h-8 w-auto opacity-80" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div aria-hidden className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="rounded-xl border border-border/80 bg-card px-5 py-4 shadow-elevation-1">
            <div className="h-5 w-[75%] max-w-xs animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="rounded-xl border border-border/80 bg-card px-5 py-4 shadow-elevation-1">
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

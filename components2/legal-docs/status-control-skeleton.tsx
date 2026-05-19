export function StatusControlSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading status"
      className="min-h-svh animate-pulse bg-background pb-16 text-foreground"
    >
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-4 sm:px-6">
        <header className="border-b border-border pt-4 pb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="h-10 w-[214px] rounded-md bg-muted" />
            <div className="grid gap-2 sm:items-end">
              <div className="h-3 w-40 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.95fr)] lg:items-end">
            <div className="grid gap-4">
              <div className="h-3 w-36 rounded bg-muted" />
              <div className="h-14 w-full max-w-lg rounded-md bg-muted" />
              <div className="h-20 w-full max-w-[760px] rounded-md bg-muted" />
            </div>
            <div className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-elevation-1">
              <div className="h-6 w-32 rounded bg-muted" />
              <div className="h-10 w-full rounded-md bg-muted" />
              <div className="h-16 w-full rounded-md bg-muted" />
            </div>
          </div>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="h-48 rounded-lg border border-border bg-muted/40" />
          <div className="h-48 rounded-lg border border-border bg-muted/40" />
        </div>
      </div>
    </main>
  )
}

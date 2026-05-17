import { APP_SHELL_CONTENT_PANE_INSET_CLASS } from "../top-utils-bar/appshell-utility-chrome.shared"

type AppSubLayoutShellSkeletonProps = {
  /** Visible status for assistive tech while the nested app shell streams. */
  statusLabel?: string
}

/**
 * Layout-shaped Suspense fallback for nested `AppSubLayout` routes — mirrors
 * [`AppSubLayoutClient`](./appshell-sub-layout.client.tsx) rail + main
 * column geometry so CLS stays low when Tier B data resolves.
 *
 * @see https://nextjs.org/docs/app/guides/streaming
 */
export function AppSubLayoutShellSkeleton({
  statusLabel = "Loading",
}: AppSubLayoutShellSkeletonProps) {
  return (
    <div
      className="flex min-h-0 flex-1 overflow-hidden md:bg-sidebar"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{statusLabel}</span>
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-sidebar-border p-3 md:flex">
        <div className="h-8 w-full animate-pulse rounded-md bg-sidebar-accent/60 motion-reduce:animate-none" />
        <div className="h-7 w-[85%] animate-pulse rounded-md bg-sidebar-accent/50 motion-reduce:animate-none" />
        <div className="h-7 w-[70%] animate-pulse rounded-md bg-sidebar-accent/50 motion-reduce:animate-none" />
        <div className="h-7 w-[80%] animate-pulse rounded-md bg-sidebar-accent/50 motion-reduce:animate-none" />
        <div className="mt-auto h-14 w-full animate-pulse rounded-md bg-sidebar-accent/40 motion-reduce:animate-none" />
      </div>
      <div
        className={`flex min-w-0 flex-1 flex-col bg-background ${APP_SHELL_CONTENT_PANE_INSET_CLASS}`}
      >
        <div className="flex min-h-[min(40vh,24rem)] min-w-0 flex-1 flex-col gap-3 p-6">
          <div className="h-8 w-48 max-w-[70%] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-md bg-muted/80 motion-reduce:animate-none" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-muted/80 motion-reduce:animate-none" />
          <div className="h-4 w-2/3 max-w-lg animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}

import type { ReactNode } from "react"

import { Spinner } from "#components2/ui/spinner"

type SegmentRouteSpinnerProps = {
  /** Optional caption (e.g. translated loading copy for narrow flows). */
  children?: ReactNode
}

/**
 * Default `loading.tsx` shell for locale-scoped routes: centered spinner and
 * `aria-live` region. With `children`, uses a narrow centered column (invite flow).
 */
export function SegmentRouteSpinner({ children }: SegmentRouteSpinnerProps) {
  const narrow = Boolean(children)

  return (
    <div
      className={
        narrow
          ? "mx-auto flex min-h-[200px] max-w-md flex-col items-center justify-center gap-3 py-10"
          : "flex min-h-[200px] flex-1 flex-col items-center justify-center py-10"
      }
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner className="size-8 text-muted-foreground" />
      {children}
    </div>
  )
}

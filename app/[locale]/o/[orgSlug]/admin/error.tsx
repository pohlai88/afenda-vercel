"use client"

import { useEffect } from "react"

import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import type { NextAppErrorPageProps } from "#lib/next-app-error-page-props.shared"

/**
 * Org-admin tier error boundary — keeps the workbench shell (sidebar, header)
 * mounted while the page content recovers.
 */
export default function OrgAdminError({
  error,
  unstable_retry,
  reset,
}: NextAppErrorPageProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-medium text-foreground">
        Admin section failed to load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The workbench shell is still available — try again, or navigate to
        another section from the sidebar.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
      <RouteErrorRetryButton unstable_retry={unstable_retry} reset={reset}>
        Try again
      </RouteErrorRetryButton>
    </div>
  )
}

"use client"

import { useRouteEnvelope } from "#components2/route-envelope-context.client"
import { RouteErrorDebugPanel } from "#components2/dev/route-error-debug-panel"
import { RouteErrorRetryButton } from "#components2/route-error/route-error-retry-button"
import { useReportRouteError } from "#components2/route-error/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#components2/route-error/error-page-props.shared"

/**
 * Org-admin tier error boundary — keeps the app shell (sidebar, header)
 * mounted while the page content recovers.
 */
export default function OrgAdminError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.orgSlug ? `admin/${envelope.orgSlug}` : "org/admin"
  useReportRouteError({ segment, error })

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-medium text-foreground">
        Admin section failed to load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The app shell is still available — try again, or navigate to another
        section from the sidebar.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
      <RouteErrorRetryButton
        retryAction={retryAction}
        resetAction={resetAction}
      >
        Try again
      </RouteErrorRetryButton>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </div>
  )
}

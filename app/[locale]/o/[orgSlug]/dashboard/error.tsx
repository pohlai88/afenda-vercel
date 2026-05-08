"use client"

import { useRouteEnvelope } from "#components/route-envelope-context"
import { RouteErrorDebugPanel } from "#components/dev/route-error-debug-panel"
import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import { useReportRouteError } from "#components/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#lib/next-app-error-page-props.shared"

/**
 * Dashboard-tier error boundary — keeps the org dashboard shell (top bar, module nav)
 * mounted while the page content recovers.
 *
 * Reads RouteEnvelope from context (set by dashboard/layout.tsx) to include
 * org-scoped segment info in error reports for better observability.
 */
export default function OrgDashboardError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.orgSlug
    ? `dashboard/${envelope.orgSlug}`
    : "dashboard"
  useReportRouteError({ segment, error })

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-medium text-foreground">
        This page could not load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The dashboard shell is still available — try reloading the panel or
        navigate to another module from the sidebar.
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

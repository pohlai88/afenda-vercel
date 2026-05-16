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
 * Platform admin (operator) tier error boundary — keeps the operator shell mounted
 * so cross-tenant navigation remains available while the panel recovers.
 */
export default function OperatorError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.locale ? `operator/${envelope.locale}` : "operator"
  useReportRouteError({ segment, error })

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-medium text-foreground">
        Operator panel failed to load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Try again, or navigate to another panel from the sidebar.
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

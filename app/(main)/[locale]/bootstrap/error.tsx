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
 * Bootstrap-tier error boundary; envelope carries locale for reporting.
 */
export default function BootstrapError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.locale
    ? `bootstrap/${envelope.locale}`
    : "bootstrap"
  useReportRouteError({ segment, error })

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-medium text-foreground">
        Bootstrap setup failed to load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Try again, or return to your dashboard from the home page.
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

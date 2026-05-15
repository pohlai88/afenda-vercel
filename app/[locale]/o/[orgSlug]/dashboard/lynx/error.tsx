"use client"

import { RouteErrorDebugPanel } from "#components/dev/route-error-debug-panel"
import {
  RouteErrorActions,
  RouteErrorDigest,
  RouteErrorShell,
} from "#components/route-error-primitives"
import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import { useRouteEnvelope } from "#components/route-envelope-context"
import { useReportRouteError } from "#components/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#lib/next-app-error-page-props.shared"

/**
 * Lynx surface error boundary — keeps the dashboard shell mounted while
 * the Lynx machine / Truth Retrieval surface recovers from uncaught render or
 * network failures (streaming, embedding, external AI provider timeouts).
 */
export default function LynxError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.orgSlug
    ? `dashboard/${envelope.orgSlug}/lynx`
    : "dashboard/lynx"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell>
      <h1 className="text-2xl font-semibold text-foreground">
        Lynx could not load
      </h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong while rendering the Lynx surface. This may be a
        transient network or AI provider issue — try again or navigate to
        another module.
      </p>
      <RouteErrorDigest digest={error.digest} />
      <RouteErrorActions>
        <RouteErrorRetryButton
          retryAction={retryAction}
          resetAction={resetAction}
        >
          Try again
        </RouteErrorRetryButton>
      </RouteErrorActions>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </RouteErrorShell>
  )
}

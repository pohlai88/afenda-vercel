"use client"

import { useRouteEnvelope } from "#components/route-envelope-context"
import { RouteErrorDebugPanel } from "#components/dev/route-error-debug-panel"
import {
  RouteErrorActions,
  RouteErrorDigest,
  RouteErrorShell,
} from "#components/route-error-primitives"
import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import { useReportRouteError } from "#components/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#lib/next-app-error-page-props.shared"

/**
 * Portal-tier error boundary — keeps PortalShell mounted while content recovers.
 */
export default function PortalError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.portalSlug
    ? `portal/${envelope.portalSlug}`
    : "portal"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell variant="embedded">
      <h1 className="text-2xl font-semibold text-foreground">
        This portal page could not load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your portal session is still active. Try reloading this section or
        return to another employee self-service area.
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

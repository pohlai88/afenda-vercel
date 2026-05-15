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
      <h2 className="text-lg font-semibold">Portal unavailable</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        This portal could not be loaded. Retry the request, or contact your
        organization administrator if the problem continues.
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

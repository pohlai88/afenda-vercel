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
 * Orbit surface error boundary — keeps the org WorkbenchCommandLayer and orbit
 * chrome mounted while the Orbit page content recovers.
 *
 * Reads RouteEnvelope from context (set by orbit/layout.tsx) for observability.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function OrbitError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.orgSlug ? `orbit/${envelope.orgSlug}` : "orbit"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell variant="embedded">
      <h1 className="text-2xl font-semibold text-foreground">
        Orbit could not load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The workspace shell is still available — try reloading or navigate to
        another module from the rail.
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

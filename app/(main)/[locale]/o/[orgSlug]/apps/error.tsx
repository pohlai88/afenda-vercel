"use client"

import { RouteErrorDebugPanel } from "#components2/dev/route-error-debug-panel"
import {
  RouteErrorActions,
  RouteErrorDigest,
  RouteErrorShell,
} from "#components2/route-error/route-error-primitives"
import { RouteErrorRetryButton } from "#components2/route-error/route-error-retry-button"
import { useRouteEnvelope } from "#components2/route-envelope-context.client"
import { useReportRouteError } from "#components2/route-error/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#components2/route-error/error-page-props.shared"

/**
 * ERP apps-tier error boundary — keeps the org AppShell (utility bar, module chrome)
 * mounted while the page content recovers.
 *
 * Reads RouteEnvelope from context (set by `o/[orgSlug]/layout.tsx`) for observability.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function OrgAppsError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.orgSlug ? `apps/${envelope.orgSlug}` : "apps"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell variant="embedded">
      <h1 className="text-2xl font-semibold text-foreground">
        This page could not load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The app shell is still available — try reloading the panel or navigate
        to another module from the rail.
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

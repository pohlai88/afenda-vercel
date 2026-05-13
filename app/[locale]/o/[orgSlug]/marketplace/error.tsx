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
 * Org marketplace error boundary — scoped recovery under `AppShell` / `AppSubLayout`.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function OrgMarketplaceError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.orgSlug
    ? `marketplace/${envelope.orgSlug}`
    : "marketplace"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell variant="embedded">
      <h1 className="text-2xl font-semibold text-foreground">
        Marketplace could not load
      </h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong while rendering the marketplace. Try again or return
        to your organization home from the utility bar.
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

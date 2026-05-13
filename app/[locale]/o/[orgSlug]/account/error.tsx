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
 * Org-scoped account workbench error boundary — keeps `AppSubLayout` chrome while
 * identity / security pages recover.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function OrgAccountWorkbenchError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.orgSlug
    ? `account/${envelope.orgSlug}`
    : "account"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell variant="embedded">
      <h1 className="text-2xl font-semibold text-foreground">
        Account settings could not load
      </h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong while rendering this account area. The rail and shell
        remain available — try again or navigate from the sidebar.
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

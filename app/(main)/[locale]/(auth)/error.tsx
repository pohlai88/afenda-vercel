"use client"

import { RouteErrorDebugPanel } from "#components2/dev/route-error-debug-panel"
import {
  RouteErrorActions,
  RouteErrorDigest,
  RouteErrorShell,
} from "#components2/route-error/route-error-primitives"
import { RouteErrorRetryButton } from "#components2/route-error/route-error-retry-button"
import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { useReportRouteError } from "#components2/route-error/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#components2/route-error/error-page-props.shared"

/**
 * Auth-shell error boundary — sign-in / sign-up / verify / reset flows.
 * Falls back to a clean recovery surface when an auth form/page errors out.
 */
export default function AuthError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const segment = "auth"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell variant="auth">
      <h1 className="text-2xl font-semibold text-foreground">Sign-in error</h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong while loading this page. Try again, or return to
        sign in.
      </p>
      <RouteErrorDigest digest={error.digest} />
      <RouteErrorActions>
        <RouteErrorRetryButton
          retryAction={retryAction}
          resetAction={resetAction}
        >
          Try again
        </RouteErrorRetryButton>
        <Button variant="outline" asChild>
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </RouteErrorActions>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </RouteErrorShell>
  )
}

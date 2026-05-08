"use client"

import { useRouteEnvelope } from "#components/route-envelope-context"
import { RouteErrorDebugPanel } from "#components/dev/route-error-debug-panel"
import { RouteErrorActions } from "#components/route-error-primitives"
import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import { useReportRouteError } from "#components/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#lib/next-app-error-page-props.shared"

/**
 * IAM-shell error boundary — account, identity, security, onboarding.
 * Keeps the user inside the locale shell with a path back to safety.
 */
export default function IamError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.locale
    ? `${envelope.surface}/${envelope.locale}`
    : "iam"
  useReportRouteError({ segment, error })

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        This page could not load
      </h1>
      <p className="text-sm text-muted-foreground">
        Try again, or return to your dashboard.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
      <RouteErrorActions>
        <RouteErrorRetryButton
          retryAction={retryAction}
          resetAction={resetAction}
        >
          Try again
        </RouteErrorRetryButton>
        <Button variant="outline" asChild>
          <Link href="/o">Dashboard</Link>
        </Button>
      </RouteErrorActions>
      <RouteErrorDebugPanel segment="iam" error={error} />
    </main>
  )
}

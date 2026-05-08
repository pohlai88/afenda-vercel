"use client"

import { useRouteEnvelope } from "#components/route-envelope-context"
import { AfendaBrandLockup } from "#components/afenda-brand"
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
 * Locale-tier error boundary — catches RSC/render errors below `app/[locale]/layout.tsx`
 * (sign-in, account, dashboard, admin, operator, etc.). The locale `<html lang>` and
 * theme provider stay mounted so the user can recover without a full reload.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function LocaleError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.locale ? `locale/${envelope.locale}` : "locale"
  useReportRouteError({ segment, error })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link
        href="/"
        prefetch={false}
        className="rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <AfendaBrandLockup className="max-w-[200px]" />
      </Link>
      <div className="flex max-w-md flex-col gap-2 text-center">
        <h1 className="text-lg font-medium text-foreground">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. You can try again or return home.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
      <RouteErrorActions>
        <RouteErrorRetryButton
          retryAction={retryAction}
          resetAction={resetAction}
        >
          Try again
        </RouteErrorRetryButton>
        <Button variant="outline" asChild>
          <Link href="/" prefetch={false}>
            Go home
          </Link>
        </Button>
      </RouteErrorActions>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </div>
  )
}

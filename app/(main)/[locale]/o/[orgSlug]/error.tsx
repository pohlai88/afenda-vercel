"use client"

import Link from "next/link"

import { useRouteEnvelope } from "#components2/route-envelope-context.client"
import { RouteErrorDebugPanel } from "#components2/dev/route-error-debug-panel"
import { RouteErrorActions } from "#components2/route-error/route-error-primitives"
import { RouteErrorRetryButton } from "#components2/route-error/route-error-retry-button"
import { Button } from "#components2/ui/button"
import { DEFAULT_LOCALE_HOME_PATH } from "#lib/i18n/root-default-locale-href.shared"
import { useReportRouteError } from "#components2/route-error/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#components2/route-error/error-page-props.shared"

/**
 * Org-tier error boundary — catches failures inside `app/[locale]/o/[orgSlug]/layout.tsx`
 * (cross-tenant guard, slug resolution, session refresh) so the locale shell stays
 * intact instead of escalating to `app/[locale]/error.tsx`.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function OrgError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.orgSlug ? `org/${envelope.orgSlug}` : "org"
  useReportRouteError({ segment, error })

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-medium text-foreground">
        We could not open this organization
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your session could not resolve this workspace. Try again, or return to
        the home page to pick another organization.
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
        <Button type="button" variant="outline" asChild>
          <Link href={DEFAULT_LOCALE_HOME_PATH} prefetch={false}>
            Go home
          </Link>
        </Button>
      </RouteErrorActions>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </div>
  )
}

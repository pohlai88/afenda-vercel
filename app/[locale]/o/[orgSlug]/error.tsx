"use client"

import { useEffect } from "react"
import Link from "next/link"

import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import { Button } from "#components/ui/button"
import { DEFAULT_LOCALE_HOME_PATH } from "#lib/i18n/root-default-locale-href.shared"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#lib/next-app-error-page-props.shared"

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
  useEffect(() => {
    console.error(error)
  }, [error])

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
      <div className="flex flex-wrap items-center justify-center gap-3">
        <RouteErrorRetryButton retryAction={retryAction} resetAction={resetAction}>
          Try again
        </RouteErrorRetryButton>
        <Button type="button" variant="outline" asChild>
          <Link href={DEFAULT_LOCALE_HOME_PATH} prefetch={false}>
            Go home
          </Link>
        </Button>
      </div>
    </div>
  )
}

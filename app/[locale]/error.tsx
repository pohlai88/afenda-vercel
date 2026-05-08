"use client"

import { useEffect } from "react"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import type { NextAppErrorPageProps } from "#lib/next-app-error-page-props.shared"

/**
 * Locale-tier error boundary — catches RSC/render errors below `app/[locale]/layout.tsx`
 * (sign-in, account, dashboard, admin, operator, etc.). The locale `<html lang>` and
 * theme provider stay mounted so the user can recover without a full reload.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function LocaleError({
  error,
  unstable_retry,
  reset,
}: NextAppErrorPageProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

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
      <div className="flex flex-wrap items-center justify-center gap-3">
        <RouteErrorRetryButton unstable_retry={unstable_retry} reset={reset}>
          Try again
        </RouteErrorRetryButton>
        <Button variant="outline" asChild>
          <Link href="/" prefetch={false}>
            Go home
          </Link>
        </Button>
      </div>
    </div>
  )
}

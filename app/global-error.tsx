"use client"

import { useEffect } from "react"
import Link from "next/link"

import "./globals.css"
import { Button } from "#components/ui/button"
import { DEFAULT_LOCALE_HOME_PATH } from "#lib/i18n/root-default-locale-href.shared"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#lib/next-app-error-page-props.shared"

/**
 * Root fatal-error UI — must include `<html>` / `<body>` (replaces root layout when active).
 * Next.js 16+ passes `unstable_retry`; older callers may still pass `reset`.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-error
 */
export default function GlobalError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const retry = retryAction ?? resetAction
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
          <div className="flex max-w-md flex-col gap-2 text-center">
            <h1 className="text-lg font-medium">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              A critical error occurred. Please try again or return home.
            </p>
            {error.digest ? (
              <p className="font-mono text-xs text-muted-foreground">
                Reference: {error.digest}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button type="button" onClick={() => retry?.()}>
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href={DEFAULT_LOCALE_HOME_PATH} prefetch={false}>
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}

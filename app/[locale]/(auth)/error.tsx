"use client"

import { useEffect } from "react"

import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#lib/next-app-error-page-props.shared"

/**
 * Auth-shell error boundary — sign-in / sign-up / verify / reset flows.
 * Falls back to a clean recovery surface when an auth form/page errors out.
 */
export default function AuthError(props: NextAppErrorPageProps) {
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Sign-in error</h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong while loading this page. Try again, or return to
        sign in.
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
        <Button variant="outline" asChild>
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    </main>
  )
}

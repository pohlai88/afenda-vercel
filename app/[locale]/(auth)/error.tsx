"use client"

import { useEffect } from "react"

import { Link } from "#i18n/navigation"
import { Button } from "#components/ui/button"

/**
 * Auth-shell error boundary — sign-in / sign-up / verify / reset flows.
 * Falls back to a clean recovery surface when an auth form/page errors out.
 */
export default function AuthError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
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
        <Button type="button" onClick={() => unstable_retry()}>
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    </main>
  )
}

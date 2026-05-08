"use client"

import { useEffect } from "react"

import { Link } from "#i18n/navigation"
import { Button } from "#components/ui/button"

/**
 * IAM-shell error boundary — account, identity, security, onboarding.
 * Keeps the user inside the locale shell with a path back to safety.
 */
export default function IamError({
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
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => unstable_retry()}>
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/o">Dashboard</Link>
        </Button>
      </div>
    </main>
  )
}

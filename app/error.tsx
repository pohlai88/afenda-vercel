"use client"

import { useEffect } from "react"
import Link from "next/link"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { Button } from "#components/ui/button"
import { DEFAULT_LOCALE_HOME_PATH } from "#lib/i18n/root-default-locale-href.shared"

/**
 * Next.js 16+ error boundaries receive `unstable_retry` (canonical) instead of `reset`.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function Error({
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link
        href={DEFAULT_LOCALE_HOME_PATH}
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
        <Button type="button" onClick={() => unstable_retry()}>
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href={DEFAULT_LOCALE_HOME_PATH} prefetch={false}>
            Go home
          </Link>
        </Button>
      </div>
    </div>
  )
}

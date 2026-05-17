"use client"

import { AfendaBrandLockup } from "#components2/marketing"
import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Invalid segment under `/console` — keeps console framing (brand + recovery paths).
 */
export default function ConsoleNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <Link
          href="/console"
          prefetch={false}
          className="rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <AfendaBrandLockup className="h-8 w-auto" />
        </Link>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <h1 className="text-lg font-medium text-foreground">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This console URL does not exist.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/console">Back to organization console</Link>
        </Button>
      </div>
    </div>
  )
}

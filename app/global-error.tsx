"use client"

import { useEffect } from "react"
import Link from "next/link"

import "./globals.css"
import { Button } from "#components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
            <Button type="button" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}

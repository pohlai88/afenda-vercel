import type { ReactNode } from "react"

import { Link } from "#i18n/navigation"
import { demoPath } from "#features/demo/client"
import { cn } from "#lib/utils"

export type DemoShellProps = {
  title: string
  description: string
  /** Production path this demo mirrors (documentation string). */
  mirrors: string
  children: ReactNode
}

export function DemoShell({
  title,
  description,
  mirrors,
  children,
}: DemoShellProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Afenda Demo Showcase
            </p>
            <div className="flex min-w-0 flex-wrap items-baseline gap-2">
              <h1 className="truncate text-base font-semibold">{title}</h1>
              <span className="text-xs text-muted-foreground">Read-only</span>
            </div>
          </div>
          <Link
            href={demoPath()}
            className={cn(
              "shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
            )}
            prefetch={false}
          >
            All demos
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-2">
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          <p className="text-xs text-muted-foreground">
            Mirrors production:{" "}
            <code className="rounded bg-muted px-1 py-px font-mono">{mirrors}</code>
          </p>
        </div>
        {children}
      </main>
    </div>
  )
}

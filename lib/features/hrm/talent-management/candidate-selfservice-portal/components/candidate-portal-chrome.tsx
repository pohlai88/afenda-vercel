import type { ReactNode } from "react"

import type { PublicPortalContext } from "#lib/portal/public-portal.server"

type CandidatePortalChromeProps = {
  portal: PublicPortalContext
  children: ReactNode
}

export function CandidatePortalChrome({
  portal,
  children,
}: CandidatePortalChromeProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {portal.organizationName}
            </p>
            <h1 className="truncate text-base font-semibold">
              {portal.portalDisplayName}
            </h1>
          </div>
          <span className="text-sm text-muted-foreground capitalize">
            Careers
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}

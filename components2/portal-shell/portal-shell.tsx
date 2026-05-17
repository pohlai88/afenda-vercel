import "server-only"

import type { ReactNode } from "react"

import { DevSignInPanelGate } from "#components2/dev/dev-signin-panel-gate"
import { RouteEnvelopeProvider } from "#components2/route-envelope-context.client"
import type { PortalContext } from "#lib/portal"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

export type PortalShellProps = {
  envelope: RouteEnvelope
  context: PortalContext
  children: ReactNode
}

function userInitials(name: string | null, email: string): string {
  const source = name?.trim() || email.trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

export function PortalShell({ envelope, context, children }: PortalShellProps) {
  return (
    <RouteEnvelopeProvider value={envelope}>
      <div className="min-h-dvh bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95">
          <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {context.organizationName}
              </p>
              <div className="flex min-w-0 items-baseline gap-3">
                <h1 className="truncate text-base font-semibold">
                  {context.portalDisplayName}
                </h1>
                <span className="hidden text-sm text-muted-foreground capitalize sm:inline">
                  {context.portalAudience}
                </span>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-background text-xs font-semibold text-foreground">
                {userInitials(context.user.name, context.user.email)}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium">
                  {context.user.name ?? context.user.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {context.user.email}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>
        <DevSignInPanelGate />
      </div>
    </RouteEnvelopeProvider>
  )
}

import type { ReactNode } from "react"

import { AfendaBrandLockup } from "#components2/afenda-brand"

export function BootstrapFirstRunShell({
  subtitle,
  children,
}: {
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-xl space-y-10">
        <div className="space-y-2">
          <AfendaBrandLockup className="h-8 w-auto" />
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

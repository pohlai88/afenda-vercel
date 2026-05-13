import type { ReactNode } from "react"

import { cn } from "#lib/utils"

export type GovernedSectionProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function GovernedSection({
  title,
  description,
  children,
  className,
}: GovernedSectionProps) {
  return (
    <section className={cn("flex flex-col gap-surface-md", className)}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

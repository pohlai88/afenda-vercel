import type { Route } from "next"

import { Link } from "#i18n/navigation"

import { Button } from "#components/ui/button"
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"
import { ui } from "#lib/design-system"
import { cn } from "#lib/utils"

import type { EmptyState } from "../schemas/list-surface.schema"

export type GovernedEmptyProps = {
  model: EmptyState
  className?: string
}

const variantClassName: Record<EmptyState["variant"], string> = {
  muted: "border-dashed border-border bg-transparent",
  cta: cn(
    "border-solid border-border bg-card",
    ui.radius.card,
    ui.elevation.card
  ),
  forbidden: cn(
    "border-solid border-border bg-muted/30",
    ui.radius.card,
    ui.elevation.card
  ),
  error: cn(
    "border-solid border-destructive/40 bg-destructive/5",
    ui.radius.card
  ),
}

export function GovernedEmpty({ model, className }: GovernedEmptyProps) {
  return (
    <Empty
      className={cn(
        "border p-8 text-center sm:p-10",
        variantClassName[model.variant],
        className
      )}
    >
      <EmptyTitle>{model.title}</EmptyTitle>
      {model.description ? (
        <EmptyDescription>{model.description}</EmptyDescription>
      ) : null}
      {model.cta ? (
        <Button variant="secondary" size="sm" asChild>
          <Link href={model.cta.href as Route} prefetch={false}>
            {model.cta.label}
          </Link>
        </Button>
      ) : null}
    </Empty>
  )
}

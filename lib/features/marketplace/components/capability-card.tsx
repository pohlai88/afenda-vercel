import type { ComponentProps, ReactNode } from "react"

import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import type { ResolvedCapability } from "../types"
import {
  CapabilityToggleButton,
  type CapabilityToggleButtonProps,
} from "./capability-toggle-button.client"
import { CapabilityIcon } from "./capability-icon-map.shared"
import { cn } from "#lib/utils"
import type { ResolvedEffectiveState } from "../types"

export type CapabilityCardCopy = {
  title: string
  description: string
  /** Bottom-of-card hint ("Pinned to your utility bar"). */
  stateHint: string
  /** Localized state badge ("Mandatory", "Visible", …). */
  stateBadge: string
  /** Source badge label ("System default", "Org policy", "Your preference"). */
  sourceBadge: string
  toggle: CapabilityToggleButtonProps["labels"]
}

export type CapabilityCardProps = {
  capability: ResolvedCapability
  copy: CapabilityCardCopy
  actionSlot?: ReactNode
}

/**
 * Card view of one resolved capability — the default Marketplace
 * presentation for the Utilities category.
 *
 * Pure RSC. The only client island is the toggle button. The card
 * mirrors the calm "icon + title + description + meta" lockup used by
 * the previous admin marketplace so the visual rhythm carries forward.
 */
export function CapabilityCard({
  capability,
  copy,
  actionSlot,
}: CapabilityCardProps) {
  const tone = capabilityStateTone(capability.effective)

  return (
    <Card
      size="sm"
      className={cn(
        "min-h-[13.5rem] rounded-lg border bg-background/90 shadow-none transition-colors hover:border-foreground/20",
        tone.card
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-md border",
              tone.icon
            )}
          >
            <CapabilityIcon
              iconKey={capability.definition.iconKey}
              className="size-5"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Badge variant={tone.badge}>{copy.stateBadge}</Badge>
        <Badge variant="outline" className="text-muted-foreground">
          {copy.sourceBadge}
        </Badge>
      </CardContent>
      <CardFooter className="mt-auto flex-col items-start justify-between gap-3 border-t border-border/50 pt-surface-md sm:flex-row sm:items-center">
        <p className="max-w-[18rem] text-xs leading-relaxed text-muted-foreground">
          {copy.stateHint}
        </p>
        {actionSlot ?? (
          <CapabilityToggleButton
            capabilityId={capability.definition.id}
            effective={capability.effective}
            customizable={capability.definition.customizable}
            labels={copy.toggle}
          />
        )}
      </CardFooter>
    </Card>
  )
}

function capabilityStateTone(state: ResolvedEffectiveState): {
  card: string
  icon: string
  badge: ComponentProps<typeof Badge>["variant"]
} {
  switch (state) {
    case "mandatory":
      return {
        card: "border-l-4 border-l-warning",
        icon: "border-warning/40 bg-warning/15 text-warning-foreground dark:bg-warning/25",
        badge: "warning",
      }
    case "visible":
      return {
        card: "border-l-4 border-l-success",
        icon: "border-success/35 bg-success/10 text-success dark:bg-success/20",
        badge: "success",
      }
    case "hidden":
      return {
        card: "border-l-4 border-l-data-neutral",
        icon: "border-border/70 bg-muted/45 text-muted-foreground dark:bg-muted/35",
        badge: "secondary",
      }
    case "unavailable":
      return {
        card: "border-l-4 border-l-critical",
        icon: "border-critical/35 bg-critical/10 text-critical dark:bg-critical/20",
        badge: "critical",
      }
  }
}

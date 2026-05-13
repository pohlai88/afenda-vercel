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
}

/**
 * Card view of one resolved capability — the default Marketplace
 * presentation for the Utilities category.
 *
 * Pure RSC. The only client island is the toggle button. The card
 * mirrors the calm "icon + title + description + meta" lockup used by
 * the previous admin marketplace so the visual rhythm carries forward.
 */
export function CapabilityCard({ capability, copy }: CapabilityCardProps) {
  return (
    <Card size="sm" className="border border-border/60 bg-background/80">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/35">
            <CapabilityIcon
              iconKey={capability.definition.iconKey}
              className="size-5 text-foreground/80"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Badge variant="outline">{copy.stateBadge}</Badge>
        <Badge variant="secondary">{copy.sourceBadge}</Badge>
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t border-border/50 pt-surface-md">
        <p className="text-xs text-muted-foreground">{copy.stateHint}</p>
        <CapabilityToggleButton
          capabilityId={capability.definition.id}
          effective={capability.effective}
          customizable={capability.definition.customizable}
          labels={copy.toggle}
        />
      </CardFooter>
    </Card>
  )
}

import { Badge } from "#components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import type { ResolvedCapability } from "../types"
import {
  CapabilityToggleButton,
  type CapabilityToggleButtonProps,
} from "./capability-toggle-button.client"
import { CapabilityIcon } from "./capability-icon-map.shared"

export type CapabilityTableRowCopy = {
  title: string
  description: string
  stateBadge: string
  sourceBadge: string
}

export type CapabilityTableProps = {
  caption: string
  headers: {
    capability: string
    state: string
    source: string
    actions: string
  }
  rows: ReadonlyArray<{
    capability: ResolvedCapability
    copy: CapabilityTableRowCopy
  }>
  toggleLabels: CapabilityToggleButtonProps["labels"]
}

/**
 * Table view of resolved capabilities — denser alternative to
 * `CapabilityCard`. Useful when an org has many policies / mandatory
 * rows and an operator needs to scan instead of browse.
 */
export function CapabilityTable({
  caption,
  headers,
  rows,
  toggleLabels,
}: CapabilityTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{headers.capability}</TableHead>
            <TableHead>{headers.state}</TableHead>
            <TableHead>{headers.source}</TableHead>
            <TableHead className="text-right">{headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ capability, copy }) => {
            return (
              <TableRow key={capability.definition.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/35">
                      <CapabilityIcon
                        iconKey={capability.definition.iconKey}
                        className="size-4 text-foreground/80"
                      />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {copy.title}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {copy.description}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{copy.stateBadge}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{copy.sourceBadge}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <CapabilityToggleButton
                    capabilityId={capability.definition.id}
                    effective={capability.effective}
                    customizable={capability.definition.customizable}
                    labels={toggleLabels}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

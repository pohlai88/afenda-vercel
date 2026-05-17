import { Card, CardHeader, CardTitle } from "#components2/ui/card"

import { NexusPressureItem } from "./nexus-pressure-item"
import type { OperationalPressureItem } from "./nexus.types"

/**
 * Operational Pressure — Section B of the Nexus Field.
 *
 * Answers: "What requires attention?"
 * Material: shell / transition. Only critical resolution may enter cognition
 * (delegated to Lynx summon + interruption surface — not rendered here).
 */
export type NexusOperationalPressureProps = {
  items: OperationalPressureItem[]
}

export function NexusOperationalPressure({
  items,
}: NexusOperationalPressureProps) {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Operational pressure</CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <div className="px-surface-lg pb-surface-lg text-sm text-muted-foreground">
          No pressure detected. The system is calm.
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <NexusPressureItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Card>
  )
}

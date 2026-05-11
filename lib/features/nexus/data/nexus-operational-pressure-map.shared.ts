import { organizationOrbitPath } from "#features/planner"
import type { PlannerPressureRowForNexus } from "#features/planner/server"

import type { OperationalPressureItem } from "../types"

export function mapPlannerPressureRowsToOperationalPressureItems(
  orgSlug: string,
  rows: PlannerPressureRowForNexus[]
): OperationalPressureItem[] {
  return rows.map((row) => ({
    id: row.id,
    severity:
      row.displayPriority === "critical"
        ? "emergency"
        : row.displayPriority === "high"
          ? "critical"
          : "attention",
    title: row.title,
    surface: "Operations",
    reason:
      row.kind === "signal"
        ? `Signal: ${row.signalClass ?? row.lifecycle}`
        : row.dueAt
          ? `Due ${row.dueAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}`
          : row.lifecycle,
    evidenceCount: 0,
    primaryAction: {
      label: row.kind === "signal" ? "Open signal" : "Open item",
      command:
        row.kind === "signal"
          ? `${organizationOrbitPath(orgSlug, "signals")}?focusKind=signal&focusId=${row.id}`
          : `${organizationOrbitPath(orgSlug)}?focusKind=item&focusId=${row.id}`,
    },
  }))
}

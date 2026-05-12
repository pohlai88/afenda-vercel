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
        : row.lifecycle === "blocked"
          ? [
              row.blockedState
                ? `${row.blockedState.stage === "critical" ? "Escalation breach" : row.blockedState.stage === "urgent" ? "Escalation overdue" : "Escalation threshold reached"}`
                : null,
              row.operationalFacts?.blockedByCount
                ? `Blocked by ${row.operationalFacts.blockedByCount} dependenc${row.operationalFacts.blockedByCount === 1 ? "y" : "ies"}`
                : "Blocked execution item",
              row.operationalFacts?.activeSignalCount
                ? `${row.operationalFacts.activeSignalCount} active signal${row.operationalFacts.activeSignalCount === 1 ? "" : "s"}`
                : null,
              row.operationalFacts?.automationFailureCount
                ? `${row.operationalFacts.automationFailureCount} automation failure${row.operationalFacts.automationFailureCount === 1 ? "" : "s"}`
                : null,
              row.operationalFacts?.escalationOwnerCount
                ? "Escalation owner assigned"
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : row.operationalFacts?.automationFailureCount
            ? `${row.operationalFacts.automationFailureCount} automation failure${row.operationalFacts.automationFailureCount === 1 ? "" : "s"}`
            : row.dueAt
              ? `Due ${row.dueAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}`
              : row.lifecycle,
    evidenceCount:
      row.kind === "item"
        ? (row.operationalFacts?.activeSignalCount ?? 0) +
          (row.operationalFacts?.blockedByCount ?? 0) +
          (row.operationalFacts?.automationFailureCount ?? 0)
        : 0,
    primaryAction: {
      label: row.kind === "signal" ? "Open signal" : "Open item",
      command:
        row.kind === "signal"
          ? `${organizationOrbitPath(orgSlug, "signals")}?focusKind=signal&focusId=${row.id}`
          : `${organizationOrbitPath(orgSlug)}?focusKind=item&focusId=${row.id}`,
    },
    stageBadge:
      row.kind === "item" && row.blockedState
        ? {
            label:
              row.blockedState.stage === "critical"
                ? "Breach"
                : row.blockedState.stage === "urgent"
                  ? "Overdue"
                  : "Threshold",
            tone:
              row.blockedState.stage === "critical"
                ? "critical"
                : row.blockedState.stage === "urgent"
                  ? "warning"
                  : "info",
          }
        : null,
  }))
}

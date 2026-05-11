import "server-only"

import type { OperationalPressureItem } from "../types"

/** Row shape from {@link listIThinkHighPressureForNexus} — kept narrow for mapping only. */
export type IThinkPressureRowForOperationalPressure = {
  id: string
  title: string
  severity: string
  dueAt: Date | null
  listId: string
}

/**
 * Maps iThink high-pressure rows to {@link OperationalPressureItem} for Nexus Field + L1 utility tray.
 * Shared by the Nexus snapshot and the utility bar so pressure copy stays aligned.
 */
export function mapIThinkPressureRowsToOperationalPressureItems(
  orgSlug: string,
  rows: IThinkPressureRowForOperationalPressure[]
): OperationalPressureItem[] {
  return rows.map((row) => mapOnePressureRow(orgSlug, row))
}

function mapOnePressureRow(
  orgSlug: string,
  row: IThinkPressureRowForOperationalPressure
): OperationalPressureItem {
  const severity =
    row.severity === "critical" ? ("critical" as const) : ("attention" as const)

  return {
    id: row.id,
    severity,
    title: row.title,
    surface: "Operations",
    reason: row.dueAt
      ? `Due ${row.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : "Active",
    evidenceCount: 0,
    primaryAction: {
      label: "Open",
      command: `/o/${orgSlug}/dashboard/ithink/${row.id}`,
    },
  }
}

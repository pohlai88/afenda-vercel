import {
  NEXUS_RIGHT_UTILITY_WIDGET_IDS as SHARED_RIGHT_WIDGET_IDS,
  type NexusRightUtilityWidgetId as SharedRightWidgetId,
} from "#features/nexus"

/**
 * Left rail is reserved for workspace-level switchers (org, project, team).
 * No customizable widgets live here currently — the rail always shows the
 * brand + module nav panel.
 */
export const WORKBENCH_LEFT_UTILITY_WIDGET_IDS = [] as const

/** Right-rail widget ids — sourced from the Nexus capability catalog at build time. */
export const WORKBENCH_RIGHT_UTILITY_WIDGET_IDS = SHARED_RIGHT_WIDGET_IDS

export type WorkbenchUtilityLeftWidgetId =
  (typeof WORKBENCH_LEFT_UTILITY_WIDGET_IDS)[number]

export type WorkbenchUtilityRightWidgetId = SharedRightWidgetId

export type WorkbenchUtilityWidgetId =
  | WorkbenchUtilityLeftWidgetId
  | WorkbenchUtilityRightWidgetId

export const ALL_WORKBENCH_UTILITY_WIDGET_IDS: WorkbenchUtilityWidgetId[] = [
  ...WORKBENCH_LEFT_UTILITY_WIDGET_IDS,
  ...WORKBENCH_RIGHT_UTILITY_WIDGET_IDS,
]

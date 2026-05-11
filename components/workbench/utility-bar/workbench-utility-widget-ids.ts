import {
  NEXUS_RIGHT_UTILITY_WIDGET_IDS as SHARED_RIGHT_WIDGET_IDS,
  type NexusRightUtilityWidgetId as SharedRightWidgetId,
} from "#features/nexus"

/**
 * Left rail is reserved for workspace-level switchers (org, project, team).
 * No customizable widgets live here currently — the rail always shows the
 * brand + module nav panel.
 */
export const NEXUS_LEFT_UTILITY_WIDGET_IDS = [] as const

export const NEXUS_RIGHT_UTILITY_WIDGET_IDS = SHARED_RIGHT_WIDGET_IDS

export type NexusUtilityLeftWidgetId =
  (typeof NEXUS_LEFT_UTILITY_WIDGET_IDS)[number]

export type NexusUtilityRightWidgetId = SharedRightWidgetId

export type NexusUtilityWidgetId =
  | NexusUtilityLeftWidgetId
  | NexusUtilityRightWidgetId

export const ALL_NEXUS_UTILITY_WIDGET_IDS: NexusUtilityWidgetId[] = [
  ...NEXUS_LEFT_UTILITY_WIDGET_IDS,
  ...NEXUS_RIGHT_UTILITY_WIDGET_IDS,
]

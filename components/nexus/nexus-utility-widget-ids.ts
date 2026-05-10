/**
 * L1 utility bar widget identifiers — rail prefix encodes placement:
 * `left.*`  = workspace context (org / project / team switcher zone)
 * `right.*` = operational utilities + personal controls (before identity menu)
 */

/**
 * Left rail is reserved for workspace-level switchers (org, project, team).
 * No customizable widgets live here currently — the rail always shows the
 * brand + module nav panel.
 */
export const NEXUS_LEFT_UTILITY_WIDGET_IDS = [] as const

export const NEXUS_RIGHT_UTILITY_WIDGET_IDS = [
  "right.console",
  "right.quickCreate",
  "right.notifications",
  "right.connectivity",
  "right.diagnosis",
  "right.searchMobile",
  "right.shortcuts",
  "right.help",
  "right.theme",
  "right.density",
  "right.locale",
  "right.messenger",
  "right.feedback",
  "right.screenshot",
  "right.upload",
  "right.storage",
  "right.insight",
  "right.integrations",
  "right.settings",
] as const

export type NexusUtilityLeftWidgetId =
  (typeof NEXUS_LEFT_UTILITY_WIDGET_IDS)[number]

export type NexusUtilityRightWidgetId =
  (typeof NEXUS_RIGHT_UTILITY_WIDGET_IDS)[number]

export type NexusUtilityWidgetId =
  | NexusUtilityLeftWidgetId
  | NexusUtilityRightWidgetId

export const ALL_NEXUS_UTILITY_WIDGET_IDS: NexusUtilityWidgetId[] = [
  ...NEXUS_LEFT_UTILITY_WIDGET_IDS,
  ...NEXUS_RIGHT_UTILITY_WIDGET_IDS,
]

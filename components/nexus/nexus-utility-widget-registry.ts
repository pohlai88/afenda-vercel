import type {
  NexusUtilityLeftWidgetId,
  NexusUtilityRightWidgetId,
  NexusUtilityWidgetId,
} from "./nexus-utility-widget-ids"
import {
  NEXUS_LEFT_UTILITY_WIDGET_IDS,
  NEXUS_RIGHT_UTILITY_WIDGET_IDS,
} from "./nexus-utility-widget-ids"

export type NexusUtilityWidgetRegistryEntry = {
  /** User may toggle in Customize sheet */
  customizable: boolean
  /** Used when no persisted preference exists */
  defaultVisible: boolean
}

export const NEXUS_UTILITY_WIDGET_REGISTRY: Record<
  NexusUtilityRightWidgetId,
  NexusUtilityWidgetRegistryEntry
> = {
  "right.console": { customizable: true, defaultVisible: true },
  "right.quickCreate": { customizable: true, defaultVisible: true },
  "right.notifications": { customizable: true, defaultVisible: true },
  "right.connectivity": { customizable: true, defaultVisible: true },
  "right.diagnosis": { customizable: true, defaultVisible: true },

  "right.searchMobile": { customizable: true, defaultVisible: true },
  "right.shortcuts": { customizable: true, defaultVisible: true },
  "right.help": { customizable: true, defaultVisible: true },
  "right.theme": { customizable: true, defaultVisible: true },
  "right.density": { customizable: true, defaultVisible: true },
  "right.locale": { customizable: true, defaultVisible: true },
  "right.messenger": { customizable: true, defaultVisible: false },
  "right.feedback": { customizable: true, defaultVisible: true },
  "right.screenshot": { customizable: true, defaultVisible: false },
  "right.upload": { customizable: true, defaultVisible: false },
  "right.storage": { customizable: true, defaultVisible: true },
  "right.insight": { customizable: true, defaultVisible: true },
  "right.integrations": { customizable: true, defaultVisible: true },
  "right.settings": { customizable: true, defaultVisible: true },
}

export function isLeftUtilityWidgetId(
  id: NexusUtilityWidgetId
): id is NexusUtilityLeftWidgetId {
  return (NEXUS_LEFT_UTILITY_WIDGET_IDS as readonly string[]).includes(id)
}

export function isRightUtilityWidgetId(
  id: NexusUtilityWidgetId
): id is NexusUtilityRightWidgetId {
  return (NEXUS_RIGHT_UTILITY_WIDGET_IDS as readonly string[]).includes(id)
}

export function defaultUtilityWidgetVisibility(
  id: NexusUtilityWidgetId
): boolean {
  if (id in NEXUS_UTILITY_WIDGET_REGISTRY) {
    return NEXUS_UTILITY_WIDGET_REGISTRY[id as NexusUtilityRightWidgetId]
      .defaultVisible
  }
  return false
}

export function isUtilityWidgetCustomizable(
  id: NexusUtilityWidgetId
): boolean {
  if (id in NEXUS_UTILITY_WIDGET_REGISTRY) {
    return NEXUS_UTILITY_WIDGET_REGISTRY[id as NexusUtilityRightWidgetId]
      .customizable
  }
  return false
}

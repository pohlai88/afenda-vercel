export const NEXUS_RIGHT_RAIL_VISIBLE_LIMIT = 9 as const

export const NEXUS_UTILITY_MARKETPLACE_SOURCE = "utility-marketplace" as const
export const NEXUS_UTILITY_MARKETPLACE_REQUEST_KIND = "rail-icon" as const

export type NexusUtilityIconKey =
  | "activity"
  | "bell"
  | "building2"
  | "camera"
  | "circleHelp"
  | "database"
  | "keyboard"
  | "languages"
  | "layoutGrid"
  | "messageCircle"
  | "messageSquare"
  | "penLine"
  | "search"
  | "shieldCheck"
  | "sparkles"
  | "store"
  | "sun"
  | "upload"
  | "wifi"

export type NexusUtilityMarketplaceStatus =
  | "installed"
  | "availableByRequest"
  | "comingSoon"

export type NexusUtilityCatalogItemKey =
  | "marketplace"
  | "console"
  | "quickCreate"
  | "notifications"
  | "connectivity"
  | "diagnosis"
  | "searchMobile"
  | "shortcuts"
  | "help"
  | "theme"
  | "density"
  | "locale"
  | "messenger"
  | "feedback"
  | "screenshot"
  | "upload"
  | "storage"
  | "insight"
  | "settings"
  | "customIcon"

export type NexusUtilityCatalogEntry = {
  id: string
  itemKey: NexusUtilityCatalogItemKey
  iconKey: NexusUtilityIconKey
  marketplaceStatus: NexusUtilityMarketplaceStatus
  marketplaceListed: boolean
  rightRailCompatible: boolean
  requestable: boolean
  widget: null | {
    customizable: boolean
    defaultVisible: boolean
    priority: number
    adminOnly?: boolean
    mobileOnly?: boolean
    multiOrgOnly?: boolean
    multiLocaleOnly?: boolean
  }
}

export const NEXUS_UTILITY_CATALOG = [
  {
    id: "right.marketplace",
    itemKey: "marketplace",
    iconKey: "store",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 0,
      adminOnly: true,
    },
  },
  {
    id: "right.console",
    itemKey: "console",
    iconKey: "building2",
    marketplaceStatus: "installed",
    marketplaceListed: false,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 1,
      multiOrgOnly: true,
    },
  },
  {
    id: "right.quickCreate",
    itemKey: "quickCreate",
    iconKey: "penLine",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 2,
    },
  },
  {
    id: "right.notifications",
    itemKey: "notifications",
    iconKey: "bell",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 3,
    },
  },
  {
    id: "right.insight",
    itemKey: "insight",
    iconKey: "sparkles",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 4,
    },
  },
  {
    id: "right.connectivity",
    itemKey: "connectivity",
    iconKey: "wifi",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 5,
    },
  },
  {
    id: "right.feedback",
    itemKey: "feedback",
    iconKey: "messageSquare",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 6,
    },
  },
  {
    id: "right.shortcuts",
    itemKey: "shortcuts",
    iconKey: "keyboard",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 7,
    },
  },
  {
    id: "right.help",
    itemKey: "help",
    iconKey: "circleHelp",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 8,
    },
  },
  {
    id: "right.theme",
    itemKey: "theme",
    iconKey: "sun",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 9,
    },
  },
  {
    id: "right.density",
    itemKey: "density",
    iconKey: "layoutGrid",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 10,
    },
  },
  {
    id: "right.locale",
    itemKey: "locale",
    iconKey: "languages",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 11,
      multiLocaleOnly: true,
    },
  },
  {
    id: "right.storage",
    itemKey: "storage",
    iconKey: "database",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 12,
    },
  },
  {
    id: "right.settings",
    itemKey: "settings",
    iconKey: "shieldCheck",
    marketplaceStatus: "installed",
    marketplaceListed: false,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 13,
      adminOnly: true,
    },
  },
  {
    id: "right.diagnosis",
    itemKey: "diagnosis",
    iconKey: "activity",
    marketplaceStatus: "installed",
    marketplaceListed: false,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 14,
    },
  },
  {
    id: "right.searchMobile",
    itemKey: "searchMobile",
    iconKey: "search",
    marketplaceStatus: "installed",
    marketplaceListed: false,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: true,
      priority: 15,
      mobileOnly: true,
    },
  },
  {
    id: "right.messenger",
    itemKey: "messenger",
    iconKey: "messageCircle",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: false,
      priority: 18,
    },
  },
  {
    id: "right.screenshot",
    itemKey: "screenshot",
    iconKey: "camera",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: false,
      priority: 17,
    },
  },
  {
    id: "right.upload",
    itemKey: "upload",
    iconKey: "upload",
    marketplaceStatus: "installed",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: false,
    widget: {
      customizable: true,
      defaultVisible: false,
      priority: 16,
    },
  },
  {
    id: "marketplace.customIcon",
    itemKey: "customIcon",
    iconKey: "store",
    marketplaceStatus: "availableByRequest",
    marketplaceListed: true,
    rightRailCompatible: true,
    requestable: true,
    widget: null,
  },
] as const satisfies ReadonlyArray<NexusUtilityCatalogEntry>

export type NexusUtilityCatalogId = (typeof NEXUS_UTILITY_CATALOG)[number]["id"]

export type NexusRightUtilityWidgetId = Extract<
  NexusUtilityCatalogId,
  `right.${string}`
>

export type NexusRightUtilityAvailabilityContext = {
  isAdmin: boolean
  isMobile: boolean
  multiLocale: boolean
  multiOrg: boolean
}

export function getNexusUtilityCatalogEntry(id: NexusUtilityCatalogId) {
  return NEXUS_UTILITY_CATALOG.find((entry) => entry.id === id) ?? null
}

export const NEXUS_RIGHT_UTILITY_WIDGET_IDS = NEXUS_UTILITY_CATALOG.filter(
  (
    entry
  ): entry is Extract<
    (typeof NEXUS_UTILITY_CATALOG)[number],
    { widget: NonNullable<(typeof NEXUS_UTILITY_CATALOG)[number]["widget"]> }
  > => entry.widget !== null
).map((entry) => entry.id) as readonly NexusRightUtilityWidgetId[]

export function isInstalledNexusRightUtilityWidgetId(
  id: string
): id is NexusRightUtilityWidgetId {
  const entry = getNexusUtilityCatalogEntry(id as NexusUtilityCatalogId)
  return Boolean(entry?.widget && entry.marketplaceStatus === "installed")
}

export function isNexusRightUtilityAvailable(
  id: NexusRightUtilityWidgetId,
  ctx: NexusRightUtilityAvailabilityContext
): boolean {
  const entry = getNexusUtilityCatalogEntry(id)
  if (!entry?.widget || entry.marketplaceStatus !== "installed") return false
  const widget = entry.widget
  if ("adminOnly" in widget && widget.adminOnly && !ctx.isAdmin) return false
  if ("mobileOnly" in widget && widget.mobileOnly && !ctx.isMobile) return false
  if ("multiLocaleOnly" in widget && widget.multiLocaleOnly && !ctx.multiLocale)
    return false
  if ("multiOrgOnly" in widget && widget.multiOrgOnly && !ctx.multiOrg)
    return false
  return true
}

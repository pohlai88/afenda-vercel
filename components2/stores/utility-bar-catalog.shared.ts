/**
 * Utility bar item catalog — shared by {@link ./utility-bar.store} and app-shell UI.
 * Lives under `stores/` so persistence logic does not import from `app-shell/`.
 */

export type UtilityBarSection = "utilities" | "integrations" | "plugins"

export type UtilityBarItemId =
  | "search-mobile"
  | "quick-create"
  | "insight"
  | "theme"
  | "density"
  | "locale"
  | "shortcuts"
  | "feedback"
  | "help"
  | "settings"
  | "connectivity"
  | "storage"
  | "screenshot"
  | "upload"
  | "diagnosis"
  | "messenger"
  | "coordination"

export type UtilityBarItemDef = {
  id: UtilityBarItemId
  label: string
  description: string
  iconName: string
  section: UtilityBarSection
  defaultVisible: boolean
  defaultOrder: number
  isLink: boolean
  searchAliases?: readonly string[]
}

/**
 * Maximum visible right-rail slots including the avatar disc.
 * Catalog toggles cap at {@link UTILITY_BAR_MAX_VISIBLE} − 1 icons.
 */
export const UTILITY_BAR_MAX_VISIBLE = 12

export const UTILITY_BAR_CATALOG: readonly UtilityBarItemDef[] = [
  {
    id: "search-mobile",
    label: "Mobile search",
    description: "Search button visible only on small screens.",
    iconName: "Search",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 0,
    isLink: false,
  },
  {
    id: "quick-create",
    label: "Quick create",
    description: "Open a creation flow from anywhere.",
    iconName: "PenLine",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 1,
    isLink: false,
  },
  {
    id: "insight",
    label: "Insight",
    description: "Machine-powered Lynx insight surface.",
    iconName: "Sparkles",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 2,
    isLink: true,
    searchAliases: ["lynx", "machine", "truth", "retrieval", "sparkles"],
  },
  {
    id: "theme",
    label: "Appearance",
    description: "Switch between light, dark, and system theme.",
    iconName: "Sun",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 3,
    isLink: false,
  },
  {
    id: "density",
    label: "Layout density",
    description: "Compact, comfortable, or relaxed spacing.",
    iconName: "LayoutGrid",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 4,
    isLink: false,
  },
  {
    id: "locale",
    label: "Language",
    description: "Switch the display language.",
    iconName: "Languages",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 5,
    isLink: false,
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    description: "Keyboard shortcut reference.",
    iconName: "Keyboard",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 6,
    isLink: false,
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Submit ideas, bugs, or questions.",
    iconName: "MessageSquare",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 7,
    isLink: false,
  },
  {
    id: "help",
    label: "Help",
    description: "Documentation and support links.",
    iconName: "CircleHelp",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 8,
    isLink: true,
  },
  {
    id: "settings",
    label: "Organization admin",
    description: "Members, audit, integrations, and workspace settings.",
    iconName: "ShieldCheck",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 9,
    isLink: true,
    searchAliases: [
      "admin",
      "org admin",
      "workspace admin",
      "members",
      "audit",
      "integrations",
    ],
  },
  {
    id: "connectivity",
    label: "Connectivity",
    description: "Network status indicator.",
    iconName: "Wifi",
    section: "utilities",
    defaultVisible: false,
    defaultOrder: 10,
    isLink: false,
  },
  {
    id: "storage",
    label: "Storage inspector",
    description: "Inspect local and session storage.",
    iconName: "Database",
    section: "utilities",
    defaultVisible: false,
    defaultOrder: 11,
    isLink: false,
  },
  {
    id: "screenshot",
    label: "Screenshot",
    description: "Capture and share a screen snapshot.",
    iconName: "Camera",
    section: "utilities",
    defaultVisible: false,
    defaultOrder: 12,
    isLink: false,
  },
  {
    id: "upload",
    label: "File upload",
    description: "Quickly upload a file to Blob storage.",
    iconName: "FileUp",
    section: "utilities",
    defaultVisible: false,
    defaultOrder: 13,
    isLink: false,
  },
  {
    id: "diagnosis",
    label: "Network diagnosis",
    description: "Run a network health check.",
    iconName: "Activity",
    section: "utilities",
    defaultVisible: false,
    defaultOrder: 14,
    isLink: false,
  },
  {
    id: "messenger",
    label: "Messenger",
    description: "Organization conversations — direct and group.",
    iconName: "MessageCircle",
    section: "utilities",
    defaultVisible: true,
    defaultOrder: 15,
    isLink: false,
    searchAliases: ["chat", "dm", "group chat", "conversations"],
  },
  {
    id: "coordination",
    label: "Operational coordination",
    description:
      "Coordination contexts with linked records and evidence trails.",
    iconName: "ScanSearch",
    section: "utilities",
    defaultVisible: false,
    defaultOrder: 16,
    isLink: false,
    searchAliases: ["evidence", "review", "linked record", "coordination"],
  },
] as const

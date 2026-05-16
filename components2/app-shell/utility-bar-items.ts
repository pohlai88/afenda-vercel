/**
 * Utility bar item catalog — single source of truth for every right-rail
 * icon that can appear in the AppShell utility bar.
 *
 * Sections map to marketplace tabs:
 *   "utilities"    — right-rail icon controls (managed today)
 *   "integrations" — third-party integrations  (future tab)
 *   "plugins"      — custom plug-ins            (future tab)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

/** Describes one configurable right-rail item in the catalog. */
export type UtilityBarItemDef = {
  id: UtilityBarItemId
  /** Human-readable name shown in the marketplace customization panel. */
  label: string
  /** Short helper text shown under the label in the marketplace panel. */
  description: string
  /** Lucide icon name used only for the catalog list display. */
  iconName: string
  /** Which marketplace tab this item belongs to. */
  section: UtilityBarSection
  /** Whether the item is visible in the bar on first load. */
  defaultVisible: boolean
  /**
   * Default rendering order (lower = further left in the bar).
   * Avatar disc is always appended last and is not in this list.
   */
  defaultOrder: number
  /**
   * Whether this item is a link (needs href) rather than a button.
   * Used by the DnD rail to decide which prop to pass.
   */
  isLink: boolean
  /**
   * Extra tokens for marketplace search and documentation — not shown as UI copy.
   * Example: `["lynx", "machine"]` so filtering finds the row without spelling the label.
   */
  searchAliases?: readonly string[]
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/** Maximum number of visible items in the right rail (avatar included). */
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
  // --- advanced / opt-in ---
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

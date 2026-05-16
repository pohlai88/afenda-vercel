import { createElement } from "react"
import {
  Activity,
  Bell,
  Building2,
  Camera,
  CircleHelp,
  Database,
  Keyboard,
  Languages,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  PenLine,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Upload,
  Wifi,
  type LucideIcon,
} from "lucide-react"

import type { NexusUtilityIconKey } from "#features/nexus"

/**
 * Marketplace icon map — `NexusUtilityIconKey` → Lucide component.
 *
 * Mirrors the per-key map that previously lived inline in
 * `lib/features/org-admin/components/integrations-utilities-marketplace.tsx`.
 * Centralized here so card / table / detail dialog views all draw from
 * one source. New utility-icon keys must be added in
 * `NEXUS_UTILITY_CATALOG` first; TypeScript flags any miss.
 */
export const CAPABILITY_ICONS: Record<NexusUtilityIconKey, LucideIcon> = {
  activity: Activity,
  bell: Bell,
  building2: Building2,
  camera: Camera,
  circleHelp: CircleHelp,
  database: Database,
  keyboard: Keyboard,
  languages: Languages,
  layoutGrid: LayoutGrid,
  messageCircle: MessageCircle,
  messageSquare: MessageSquare,
  penLine: PenLine,
  scanSearch: ScanSearch,
  search: Search,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  store: Store,
  sun: Sun,
  upload: Upload,
  wifi: Wifi,
}

export function resolveCapabilityIcon(iconKey: string): LucideIcon {
  return CAPABILITY_ICONS[iconKey as NexusUtilityIconKey] ?? Sparkles
}

export type CapabilityIconProps = {
  iconKey: string
  className?: string
  strokeWidth?: number
}

/**
 * Stable wrapper that resolves the icon component once per render and
 * delegates to it. The wrapper exists so call sites do not capitalize a
 * locally resolved component (which trips the
 * `react-hooks/static-components` rule).
 */
export function CapabilityIcon({
  iconKey,
  className,
  strokeWidth = 2,
}: CapabilityIconProps) {
  return createElement(resolveCapabilityIcon(iconKey), {
    "aria-hidden": true,
    className,
    strokeWidth,
  })
}

import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  BriefcaseIcon,
  Building2Icon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListIcon,
  MessagesSquareIcon,
  MonitorSmartphoneIcon,
  PlugIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShoppingBagIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react"

import type { WorkbenchRailNavIconId } from "./workbench-rail.types"

/**
 * Serializable nav-icon-token → Lucide component registry.
 *
 * Resolved only on the client side (rail is a Client Component) so that
 * RSC layouts can pass plain string tokens across the boundary.
 *
 * Keys are anchored to `WorkbenchRailNavIconId` (derived from the central
 * `WORKBENCH_RAIL_NAV_ICON_IDS` array). Adding/removing an id without
 * updating this map fails to type-check.
 */
export const RAIL_NAV_ICON_MAP = {
  activity: ActivityIcon,
  briefcase: BriefcaseIcon,
  building: BuildingIcon,
  "building-2": Building2Icon,
  calendar: CalendarIcon,
  clock: ClockIcon,
  "file-text": FileTextIcon,
  "key-round": KeyRoundIcon,
  "layout-dashboard": LayoutDashboardIcon,
  list: ListIcon,
  "messages-square": MessagesSquareIcon,
  "monitor-smartphone": MonitorSmartphoneIcon,
  plug: PlugIcon,
  settings: SettingsIcon,
  shield: ShieldIcon,
  "shield-check": ShieldCheckIcon,
  "shopping-bag": ShoppingBagIcon,
  "user-round": UserRoundIcon,
  users: UsersIcon,
} satisfies Record<WorkbenchRailNavIconId, LucideIcon>

import {
  Building2,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  PanelLeft,
  Shield,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react"

import type { WorkbenchRailIconKey } from "./workbench-rail.types"

const WORKBENCH_RAIL_ICONS: Record<WorkbenchRailIconKey, LucideIcon> = {
  userRound: UserRound,
  monitorSmartphone: MonitorSmartphone,
  shield: Shield,
  shieldCheck: ShieldCheck,
  building2: Building2,
  keyRound: KeyRound,
  logOut: LogOut,
  panelLeft: PanelLeft,
}

export function getWorkbenchRailIcon(key: WorkbenchRailIconKey): LucideIcon {
  return WORKBENCH_RAIL_ICONS[key]
}

/**
 * Client-safe Nexus door — path builders and types only (no server snapshot graph).
 * @see ADR-0030
 */
export { organizationNexusPath } from "./constants"

export type {
  QuickCreateFormKind,
  QuickCreateMenu,
  QuickCreateMenuEntry,
} from "./data/quick-create-menu.shared"

export type {
  UtilityBarCapabilityRow,
  UtilityBarRailSnapshot,
} from "./data/utility-bar-capability-bridge.shared"

export {
  capabilityIdFromUtilityBarItemId,
  utilityBarItemIdFromCapabilityId,
} from "./data/utility-bar-capability-bridge.shared"

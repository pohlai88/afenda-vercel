/**
 * Working Memory Rail (`#features/rail-memory`) — public RSC / module
 * barrel.
 *
 * Doctrinal anchor:
 *
 *   - Plan: `docs/_draft/working-memory-rail-plan.md` §§ 6, 8, 10
 *   - Kernel: `components/workbench/rail/workbench-rail.schema.ts` (Phase 3a)
 *   - IAM audit policy: `AGENTS.md §5`
 *
 * This barrel is import-safe from Server Components. Client islands
 * MUST go through `#features/rail-memory/client` (narrow Server Action
 * + types surface) so Turbopack never bundles the `server-only`
 * queries / mutations into a client chunk.
 *
 * Audit grammar lives under the `iam.workbench.*` namespace
 * (`RAIL_MEMORY_AUDIT_ACTIONS`) — `iam.*` is the canonical prefix per
 * `ORG_ADMIN_EVENT_NAMESPACES`. Recents are NOT audited (high
 * frequency; OTEL counters will land in a follow-up).
 */

// ---------------------------------------------------------------------------
// Constants — type-safe vocabulary + revalidation policy
// ---------------------------------------------------------------------------

export {
  RAIL_MEMORY_AUDIT_ACTIONS,
  RAIL_MEMORY_RESOURCE_TYPES,
  RAIL_PIN_LIMIT_PER_WORKBENCH,
  RAIL_RECENT_QUERY_LIMIT,
  RAIL_RECENT_RATE_LIMIT_SECONDS,
  RAIL_RECENT_RETENTION_LIMIT,
  RAIL_RECENT_SURFACE_LIMIT,
  RAIL_VIEW_LIMIT_PER_WORKBENCH,
  WORKBENCH_IDS,
  WORKBENCH_REVALIDATE_PATTERNS,
  isWorkbenchId,
} from "./constants"
export type {
  RailMemoryAuditAction,
  RailMemoryResourceType,
  WorkbenchId,
} from "./constants"

// ---------------------------------------------------------------------------
// Types — DTOs + action result discriminated unions
// ---------------------------------------------------------------------------

export type {
  DeleteViewResult,
  PinRecordResult,
  RailMemoryActionResult,
  RailMemoryPin,
  RailMemoryRecent,
  RailMemorySavedView,
  ReorderPinsResult,
  SaveViewResult,
  UnpinRecordResult,
  UpdateViewResult,
} from "./types"

// ---------------------------------------------------------------------------
// Schemas — server-side trust boundaries (importable from RSC + tests)
// ---------------------------------------------------------------------------

export {
  pinRecordInputSchema,
  reorderPinsInputSchema,
  unpinRecordInputSchema,
} from "./schemas/pin-input.schema"
export type {
  PinRecordInput,
  ReorderPinsInput,
  UnpinRecordInput,
} from "./schemas/pin-input.schema"

export {
  deleteViewInputSchema,
  saveViewInputSchema,
  updateViewInputSchema,
} from "./schemas/view-input.schema"
export type {
  DeleteViewInput,
  SaveViewInput,
  UpdateViewInput,
} from "./schemas/view-input.schema"

export { recordRecentVisitInputSchema } from "./schemas/recent-input.schema"
export type { RecordRecentVisitInput } from "./schemas/recent-input.schema"

// ---------------------------------------------------------------------------
// Server Actions — re-exported here so RSC pages + the matching
// client barrel converge on one identity. The `"use server"` directive
// inside each action file is what makes them callable from client
// chunks; the `client.ts` barrel below re-exports the same identities
// without dragging the rest of this graph along.
// ---------------------------------------------------------------------------

export {
  pinRecordAction,
  reorderPinsAction,
  unpinRecordAction,
} from "./actions/pin.actions"

export {
  deleteViewAction,
  saveViewAction,
  updateViewAction,
} from "./actions/view.actions"

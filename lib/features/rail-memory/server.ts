import "server-only"

/**
 * Working Memory Rail — server-only re-exports.
 *
 * Imports from this barrel MUST come from Server Components, route
 * handlers, server actions, or other `server-only` modules. Anything
 * here may transitively pull in `lib/db`, `next/headers`, or other
 * server primitives that crash inside a Client Component bundle.
 *
 * The rail-slot builders (PR 3d) compose recent / pinned / saved-view
 * DTOs into the kernel `WorkbenchRailSlots` shape via the mappers in
 * `data/mappers.shared.ts`. They live behind this barrel because the
 * mapper helpers expose `WorkbenchRail*` slot types that, while
 * structurally serializable, are conventionally only consumed from
 * server composition.
 */

// Read queries (React.cache-wrapped — same dedupe semantics as
// requireOrgSession). Callers MUST pass `(organizationId, userId,
// workbenchId)` from a validated session — never from untrusted
// input.
export { countPinsForUser, listPinnedForUser } from "./data/pin.queries.server"
export {
  countSavedViewsForUser,
  listSavedViewsForUser,
} from "./data/view.queries.server"
export { listRecentsForUser } from "./data/recent.queries.server"

// Server-only recents primitive — invoked from RSC pages on render
// to record the operator's most recent visit. NOT a Server Action —
// callers must already hold a validated `(organizationId, userId)`
// from `requireOrgSession`.
export { recordRecentVisit } from "./data/recent.mutations.server"
export type { RecordRecentVisitResult } from "./data/recent.mutations.server"

// Pin mutation primitives — exposed so a future migration-time
// backfill / scripted import can reuse the same insert shape without
// going through the Server Action. Application code should call the
// Server Actions (`pinRecordAction`, `unpinRecordAction`,
// `reorderPinsAction`) instead — they own audit + revalidation.
export {
  deletePin,
  findExistingPin,
  insertPin,
  reorderPins,
} from "./data/pin.mutations.server"
export type { DeletedPin } from "./data/pin.mutations.server"

// DTO → kernel slot mappers — exposed for rail-slot builders (PR 3d).
// Pure functions; safe to call from any server module.
export {
  dedupeRecents,
  pinDtoToSlot,
  pinRowToDto,
  recentDtoToSlot,
  recentRowToDto,
  viewDtoToSlot,
  viewRowToDto,
} from "./data/mappers.shared"

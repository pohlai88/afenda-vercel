/**
 * Working Memory Rail — narrow client-safe surface.
 *
 * Client islands (pin button on a list row, "Save view" dialog, etc.)
 * import from here, NOT from `index.ts`. Reason: `index.ts`
 * transitively re-exports query helpers + recents primitives that
 * import `server-only`; bundling them into a client chunk crashes at
 * runtime. This barrel exposes only:
 *
 *   - Server Actions (the `"use server"` boundary already makes them
 *     safe to call from clients — the function identity is the only
 *     thing that crosses the network).
 *   - Action input / result types — pure type aliases, no runtime code.
 *   - `WorkbenchId` + `WORKBENCH_IDS` — pure value constants used by
 *     client forms to render the workbench select.
 *
 * Forbidden imports here: query helpers, mappers, DB primitives,
 * server-only modules.
 */

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

export type {
  PinRecordInput,
  ReorderPinsInput,
  UnpinRecordInput,
} from "./schemas/pin-input.schema"
export type {
  DeleteViewInput,
  SaveViewInput,
  UpdateViewInput,
} from "./schemas/view-input.schema"

export type {
  DeleteViewResult,
  PinRecordResult,
  RailMemoryActionResult,
  ReorderPinsResult,
  SaveViewResult,
  UnpinRecordResult,
  UpdateViewResult,
} from "./types"

export {
  RAIL_PIN_LIMIT_PER_WORKBENCH,
  RAIL_VIEW_LIMIT_PER_WORKBENCH,
  WORKBENCH_IDS,
  isWorkbenchId,
} from "./constants"
export type { WorkbenchId } from "./constants"

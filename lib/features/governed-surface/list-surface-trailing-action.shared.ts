import type { ActionDescriptor } from "./schemas/action.schema"
import type { ListSurfaceRowTrailingAction } from "./schemas/list-surface-row-trailing-action.schema"

export type ResolveListSurfaceRowTrailingActionInput = {
  /** When false, the trailing column omits UI for this row. Default true. */
  visible?: boolean
  /** When false, UI may render disabled with `disabledReason`. */
  allowed: boolean
  /** Required when `allowed` is false (surfaced via tooltip in trailing column). */
  disabledReason?: string
  descriptor?: ActionDescriptor
}

/**
 * Pure helper for domain list-surface builders — encodes visibility, ERP/RSC
 * authorization outcome, and human-readable disable copy in row metadata.
 */
export function resolveListSurfaceRowTrailingAction(
  input: ResolveListSurfaceRowTrailingActionInput
): ListSurfaceRowTrailingAction | undefined {
  if (input.visible === false) {
    return { state: "hidden" }
  }
  if (input.allowed) {
    return input.descriptor
      ? { state: "ready", descriptor: input.descriptor }
      : { state: "ready" }
  }
  const disabledReason = input.disabledReason?.trim()
  return {
    state: "disabled",
    disabledReason: disabledReason && disabledReason.length > 0
      ? disabledReason
      : "Not permitted",
    descriptor: input.descriptor,
  }
}

export function listSurfaceRowTrailingActionHidden(): ListSurfaceRowTrailingAction {
  return { state: "hidden" }
}

export function isListSurfaceTrailingActionRenderable(
  action: ListSurfaceRowTrailingAction | undefined
): action is ListSurfaceRowTrailingAction & {
  state: "ready" | "disabled"
} {
  return action?.state === "ready" || action?.state === "disabled"
}

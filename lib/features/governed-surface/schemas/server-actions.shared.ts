import type { ActionResult } from "./action-result.shared"

/**
 * Maps governed form `actionId` strings to their Server Action handlers.
 * Feature modules register actions at the app boundary; renderers resolve
 * by id only — they never hold a direct reference to the handler.
 *
 * The registry is a module-level singleton. In production, duplicate
 * registration is a programming error and throws. In development,
 * re-registration is allowed silently so hot-module reload does not
 * crash the dev server when a consuming module is re-evaluated.
 */
export type GovernedServerActionHandler<TInput = FormData, TData = void> = (
  prev: ActionResult<TData> | undefined,
  input: TInput
) => Promise<ActionResult<TData>>

export type GovernedServerActionRegistry = ReadonlyMap<
  string,
  GovernedServerActionHandler
>

const governedServerActionRegistry = new Map<
  string,
  GovernedServerActionHandler
>()

function normalizeActionId(actionId: string): string {
  const normalized = actionId.trim()

  if (!normalized) {
    throw new Error("Governed server action id must not be empty.")
  }

  return normalized
}

export function registerGovernedServerAction(
  actionId: string,
  handler: GovernedServerActionHandler
): void {
  const normalizedActionId = normalizeActionId(actionId)

  if (governedServerActionRegistry.has(normalizedActionId)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Governed server action "${normalizedActionId}" is already registered.`
      )
    }

    // Development: allow re-registration so hot-module reload does not
    // crash when a consuming module is re-evaluated without reloading
    // the registry module itself.
    governedServerActionRegistry.set(normalizedActionId, handler)
    return
  }

  governedServerActionRegistry.set(normalizedActionId, handler)
}

export function resolveGovernedServerAction(
  actionId: string
): GovernedServerActionHandler | undefined {
  return governedServerActionRegistry.get(normalizeActionId(actionId))
}

export function getGovernedServerActionRegistry(): GovernedServerActionRegistry {
  return governedServerActionRegistry
}

export function clearGovernedServerActionRegistryForTest(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "clearGovernedServerActionRegistryForTest may only be used in tests."
    )
  }

  governedServerActionRegistry.clear()
}

import type { ErpFunction, ErpPermissionTuple } from "../types"

const LIFECYCLE_FUNCTIONS = new Set<ErpFunction>(["create", "update", "delete"])

export function detectSodConflict(
  permissions: readonly ErpPermissionTuple[]
): { module: string; object: string; functions: ErpFunction[] } | null {
  const byResource = new Map<string, Set<ErpFunction>>()

  for (const permission of permissions) {
    if (!LIFECYCLE_FUNCTIONS.has(permission.function)) continue
    const key = `${permission.module}.${permission.object}`
    const current = byResource.get(key) ?? new Set<ErpFunction>()
    current.add(permission.function)
    byResource.set(key, current)
    if (current.size > 1) {
      return {
        module: permission.module,
        object: permission.object,
        functions: [...current].sort(),
      }
    }
  }

  return null
}

export function isLifecycleFunction(fn: ErpFunction): boolean {
  return LIFECYCLE_FUNCTIONS.has(fn)
}

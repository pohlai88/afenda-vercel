/**
 * Boarding task metadata conventions for eSignature bridge (P2-06).
 */

export function boardingTaskRequiresSignature(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false
  }
  return (metadata as Record<string, unknown>).requiresSignature === true
}

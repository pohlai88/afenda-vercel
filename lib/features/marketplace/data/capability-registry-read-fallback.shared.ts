const REGISTRY_TABLE_NAMES = [
  "org_capability_policy",
  "user_capability_preference",
] as const

function isMissingRelationSignal(message: string, code: string): boolean {
  return (
    code === "42P01" ||
    message.includes("does not exist") ||
    message.toLowerCase().includes("undefined_table")
  )
}

function mentionsRegistryTable(message: string): boolean {
  return REGISTRY_TABLE_NAMES.some((name) => message.includes(name))
}

/**
 * Walks `Error.cause` (and Neon/Drizzle wrappers) so a Drizzle
 * "Failed query: …" shell still matches the underlying `42P01`.
 */
function* iterateErrorChain(err: unknown): Generator<{
  message: string
  code: string
}> {
  const seen = new Set<unknown>()
  let current: unknown = err

  while (current != null && !seen.has(current)) {
    seen.add(current)

    if (current instanceof Error) {
      const code =
        "code" in current && current.code != null ? String(current.code) : ""
      yield { message: current.message, code }
      current = current.cause
      continue
    }

    if (typeof current === "object") {
      const record = current as Record<string, unknown>
      const message =
        typeof record.message === "string" ? record.message : String(current)
      const code = record.code != null ? String(record.code) : ""
      yield { message, code }
    }

    break
  }
}

/**
 * Detects Postgres "relation does not exist" for capability-registry tables
 * before migration `0025_capability_registry` is applied. Neon / Drizzle
 * surface slightly different shapes; keep checks string-based + `42P01`.
 */
export function isCapabilityRegistryRelationMissing(err: unknown): boolean {
  for (const { message, code } of iterateErrorChain(err)) {
    if (!mentionsRegistryTable(message)) continue
    if (isMissingRelationSignal(message, code)) return true
  }
  return false
}

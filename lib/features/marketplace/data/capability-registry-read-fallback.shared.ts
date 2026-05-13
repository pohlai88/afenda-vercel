/**
 * Detects Postgres "relation does not exist" for capability-registry tables
 * before migration `0025_capability_registry` is applied. Neon / Drizzle
 * surface slightly different shapes; keep checks string-based + `42P01`.
 */
export function isCapabilityRegistryRelationMissing(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (!msg) return false

  const names = ["org_capability_policy", "user_capability_preference"]
  const mentionsRegistryTable = names.some((n) => msg.includes(n))
  if (!mentionsRegistryTable) return false

  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : ""

  return (
    code === "42P01" ||
    msg.includes("does not exist") ||
    msg.toLowerCase().includes("undefined_table")
  )
}

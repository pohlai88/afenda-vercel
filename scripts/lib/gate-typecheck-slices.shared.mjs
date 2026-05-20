/**
 * Map touched paths to incremental `tsc -b` targets (ADR-0042 Phase 2).
 * lib/db is the only acyclic composite slice today; everything else uses the platform graph.
 */

/** @typedef {{ id: string; label: string; args: string[] }} TypecheckSlice */

/** @type {TypecheckSlice[]} */
export const TYPECHECK_SLICES = [
  {
    id: "lib-db",
    label: "lib/db composite",
    args: [".config/tsconfig.lib-db.json"],
  },
  {
    id: "platform",
    label: "app platform graph",
    args: ["tsconfig.json"],
  },
]

const LIB_DB_PREFIX = "lib/db/"

/**
 * @param {string} normalizedPosixPath
 * @returns {TypecheckSlice[]}
 */
export function resolveTypecheckSlicesForPaths(paths) {
  if (paths.length === 0) {
    return TYPECHECK_SLICES
  }

  const normalized = paths.map(normalizeGatePath)
  const touchesLibDb = normalized.some(
    (p) => p === "lib/db" || p.startsWith(LIB_DB_PREFIX)
  )
  const touchesOutsideLibDb = normalized.some(
    (p) => p !== "lib/db" && !p.startsWith(LIB_DB_PREFIX)
  )

  if (touchesLibDb && touchesOutsideLibDb) {
    return TYPECHECK_SLICES
  }
  if (touchesLibDb) {
    return [TYPECHECK_SLICES[0]]
  }
  return [TYPECHECK_SLICES[1]]
}

/**
 * @param {string[]} paths
 * @returns {string}
 */
export function formatTypecheckSliceCommand(paths) {
  if (paths.length === 0) {
    return "pnpm typecheck"
  }
  const quoted = paths.map((p) => (/\s/.test(p) ? `"${p}"` : p)).join(" ")
  return `node scripts/typecheck-build.mjs ${quoted}`
}

/**
 * @param {string} raw
 */
function normalizeGatePath(raw) {
  return raw.replaceAll("\\", "/").replace(/\/+$/, "")
}

/**
 * Map touched paths to incremental `tsc -b` targets (ADR-0042 Phase 2).
 * Full builds use the solution root (`tsconfig.build.json`) per TS project-references guidance.
 */

/** @typedef {{ id: string; label: string; args: string[] }} TypecheckSlice */

/** @type {TypecheckSlice} */
export const TYPECHECK_SOLUTION_SLICE = {
  id: "solution",
  label: "full solution (project references)",
  args: ["tsconfig.build.json"],
}

/** @type {TypecheckSlice} */
const LIB_DB_SLICE = {
  id: "lib-db",
  label: "lib/db composite",
  args: [".config/tsconfig.lib-db.json"],
}

/** @type {TypecheckSlice} */
const PLATFORM_SLICE = {
  id: "platform",
  label: "app platform graph",
  args: ["tsconfig.json"],
}

/** Full solution entry — prefer {@link TYPECHECK_SOLUTION_SLICE} over listing leaf projects. */
export const TYPECHECK_SLICES = [TYPECHECK_SOLUTION_SLICE]

const LIB_DB_PREFIX = "lib/db/"

/**
 * @param {string[]} paths
 * @returns {TypecheckSlice[]}
 */
export function resolveTypecheckSlicesForPaths(paths) {
  if (paths.length === 0) {
    return [TYPECHECK_SOLUTION_SLICE]
  }

  const normalized = paths.map(normalizeGatePath)
  const touchesLibDb = normalized.some(
    (p) => p === "lib/db" || p.startsWith(LIB_DB_PREFIX)
  )
  const touchesOutsideLibDb = normalized.some(
    (p) => p !== "lib/db" && !p.startsWith(LIB_DB_PREFIX)
  )

  if (touchesLibDb && touchesOutsideLibDb) {
    return [TYPECHECK_SOLUTION_SLICE]
  }
  if (touchesLibDb) {
    return [LIB_DB_SLICE]
  }
  return [PLATFORM_SLICE]
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

/**
 * @param {TypecheckSlice[]} slices
 * @returns {boolean}
 */
export function slicePlanNeedsRouteTypegen(slices) {
  return slices.some((slice) => slice.id === "platform" || slice.id === "solution")
}

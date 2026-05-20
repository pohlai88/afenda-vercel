/**
 * Map touched paths to incremental typecheck targets (ADR-0042 Phase 2 + 6).
 * Full builds use the solution root (`tsconfig.build.json`) per TS project-references guidance.
 */

/** @typedef {"build" | "noEmit"} TypecheckSliceMode */

/** @typedef {{ id: string; label: string; mode: TypecheckSliceMode; args: string[] }} TypecheckSlice */

/** @type {TypecheckSlice} */
export const TYPECHECK_SOLUTION_SLICE = {
  id: "solution",
  label: "full solution (project references)",
  mode: "build",
  args: ["tsconfig.build.json"],
}

/** @type {TypecheckSlice} */
const LIB_DB_SLICE = {
  id: "lib-db",
  label: "lib/db composite",
  mode: "build",
  args: [".config/tsconfig.lib-db.json"],
}

/** @type {TypecheckSlice} */
const LIB_I18N_SLICE = {
  id: "lib-i18n",
  label: "lib/i18n shared composite",
  mode: "build",
  args: [".config/tsconfig.lib-i18n.json"],
}

/** @type {TypecheckSlice} */
const PLATFORM_SLICE = {
  id: "platform",
  label: "app platform graph",
  mode: "build",
  args: ["tsconfig.json"],
}

/** @type {TypecheckSlice} */
const TESTS_SLICE = {
  id: "test",
  label: "tests graph",
  mode: "noEmit",
  args: [".config/tsconfig.test.json"],
}

/** @type {TypecheckSlice} */
const SCRIPTS_SLICE = {
  id: "scripts",
  label: "scripts graph",
  mode: "noEmit",
  args: [".config/tsconfig.scripts.json"],
}

/** Full solution entry — prefer {@link TYPECHECK_SOLUTION_SLICE} over listing leaf projects. */
export const TYPECHECK_SLICES = [TYPECHECK_SOLUTION_SLICE]

const LIB_DB_PREFIX = "lib/db/"
const LIB_I18N_PREFIX = "lib/i18n/"
const TESTS_PREFIX = "tests/"
const SCRIPTS_PREFIX = "scripts/"

/**
 * @param {string} normalizedPosixPath
 * @returns {boolean}
 */
function isLibI18nSharedPath(normalizedPosixPath) {
  if (
    normalizedPosixPath !== "lib/i18n" &&
    !normalizedPosixPath.startsWith(LIB_I18N_PREFIX)
  ) {
    return false
  }
  return normalizedPosixPath.endsWith(".shared.ts")
}

/**
 * @param {string} normalizedPosixPath
 * @returns {"lib-db" | "lib-i18n" | "test" | "scripts" | "platform"}
 */
function bucketGatePath(normalizedPosixPath) {
  if (
    normalizedPosixPath === "lib/db" ||
    normalizedPosixPath.startsWith(LIB_DB_PREFIX)
  ) {
    return "lib-db"
  }
  if (isLibI18nSharedPath(normalizedPosixPath)) {
    return "lib-i18n"
  }
  if (
    normalizedPosixPath === "lib/i18n" ||
    normalizedPosixPath.startsWith(LIB_I18N_PREFIX)
  ) {
    return "platform"
  }
  if (
    normalizedPosixPath === "tests" ||
    normalizedPosixPath.startsWith(TESTS_PREFIX)
  ) {
    return "test"
  }
  if (
    normalizedPosixPath === "scripts" ||
    normalizedPosixPath.startsWith(SCRIPTS_PREFIX)
  ) {
    return "scripts"
  }
  return "platform"
}

/**
 * @param {string[]} paths
 * @returns {TypecheckSlice[]}
 */
export function resolveTypecheckSlicesForPaths(paths) {
  if (paths.length === 0) {
    return [TYPECHECK_SOLUTION_SLICE]
  }

  const buckets = new Set(paths.map(normalizeGatePath).map(bucketGatePath))

  if ((buckets.has("lib-db") || buckets.has("lib-i18n")) && buckets.size > 1) {
    return [TYPECHECK_SOLUTION_SLICE]
  }

  if (buckets.size > 1) {
    const slices = []
    if (buckets.has("test")) {
      slices.push(TESTS_SLICE)
    }
    if (buckets.has("scripts")) {
      slices.push(SCRIPTS_SLICE)
    }
    if (buckets.has("platform")) {
      slices.push(PLATFORM_SLICE)
    }
    if (slices.length > 0) {
      return slices
    }
    return [TYPECHECK_SOLUTION_SLICE]
  }

  if (buckets.has("lib-db")) {
    return [LIB_DB_SLICE]
  }
  if (buckets.has("lib-i18n")) {
    return [LIB_I18N_SLICE]
  }
  if (buckets.has("test")) {
    return [TESTS_SLICE]
  }
  if (buckets.has("scripts")) {
    return [SCRIPTS_SLICE]
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
  return slices.some(
    (slice) =>
      slice.id === "platform" || slice.id === "solution" || slice.id === "test"
  )
}

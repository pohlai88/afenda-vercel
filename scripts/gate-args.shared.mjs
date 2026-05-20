import { formatTypecheckSliceCommand } from "./lib/gate-typecheck-slices.shared.mjs"

/**
 * Parse gate CLI args — shared by gate.mjs, gate-dry-run.mjs, and unit tests.
 * @param {string[]} argv process.argv.slice(2)
 */
export function parseGateArgs(argv) {
  const dryRun = argv.includes("--dry-run")
  const typecheck = argv.includes("--typecheck")
  const filtered = argv.filter(
    (arg) =>
      arg !== "--dry-run" &&
      arg !== "--help" &&
      arg !== "-h" &&
      arg !== "--typecheck"
  )
  const dashDash = filtered.indexOf("--")
  const paths =
    dashDash === -1
      ? filtered.filter((arg) => arg !== "--" && !arg.startsWith("-"))
      : filtered
          .slice(dashDash + 1)
          .filter((arg) => arg !== "--" && Boolean(arg))

  return { dryRun, paths, typecheck }
}

/**
 * @param {string[]} paths
 * @param {{ typecheck?: boolean }} [options]
 * @returns {string[]}
 */
export function planGateCommands(paths, options = {}) {
  const { typecheck = false } = options
  const steps = []
  if (paths.length > 0) {
    steps.push(`pnpm lint:path -- ${paths.join(" ")}`)
  }
  if (paths.length === 0 || typecheck) {
    if (paths.length > 0 && typecheck) {
      steps.push(formatTypecheckSliceCommand(paths))
    } else {
      steps.push("pnpm typecheck")
    }
  }
  return steps
}

/**
 * Whether L0 should run the app typecheck graph for this invocation.
 * @param {string[]} paths
 * @param {{ typecheck?: boolean; lintOnlyEntry?: boolean }} [options]
 */
export function shouldRunGateTypecheck(paths, options = {}) {
  const { typecheck = false, lintOnlyEntry = false } = options
  if (lintOnlyEntry) return false
  return paths.length === 0 || typecheck
}

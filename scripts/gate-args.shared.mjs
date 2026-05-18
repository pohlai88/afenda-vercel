/**
 * Parse gate CLI args — shared by gate.mjs and gate-dry-run.mjs.
 * @param {string[]} argv process.argv.slice(2)
 */
export function parseGateArgs(argv) {
  const dryRun = argv.includes("--dry-run")
  const filtered = argv.filter(
    (arg) => arg !== "--dry-run" && arg !== "--help" && arg !== "-h"
  )
  const dashDash = filtered.indexOf("--")
  const paths =
    dashDash === -1
      ? filtered.filter((arg) => arg !== "--" && !arg.startsWith("-"))
      : filtered
          .slice(dashDash + 1)
          .filter((arg) => arg !== "--" && Boolean(arg))

  return { dryRun, paths }
}

/**
 * @param {string[]} paths
 * @returns {string[]}
 */
export function planGateCommands(paths) {
  const steps = []
  if (paths.length > 0) {
    steps.push(`pnpm lint:path -- ${paths.join(" ")}`)
  }
  steps.push("pnpm typecheck")
  return steps
}

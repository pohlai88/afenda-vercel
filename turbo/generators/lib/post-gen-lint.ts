/**
 * Post-generation lint runner.
 *
 * Each generator registers `postGenLint` as its final Plop custom action so
 * generated output is immediately validated:
 *
 *   1. `pnpm lint:agent-contract` — enforces directory shape, top-level
 *      allowlist, and module vocabulary. Catches violations introduced by
 *      a template before the user moves on to other work.
 *   2. `pnpm lint:eslint --fix <touched-files>` — auto-fixes formatting +
 *      import sorting against ESLint config. Generator output therefore
 *      passes `pnpm verify` on the first run.
 *
 * Failures are surfaced as Plop action failures (action returns a string
 * which Plop renders as a red status line); the underlying scripts exit
 * non-zero so the generator's "Action complete" summary becomes a failure
 * checklist for the developer to read.
 */
import { execSync } from "node:child_process"
import path from "node:path"

import { REPO_ROOT } from "./paths"

export interface PostGenLintInput {
  /** Touched file paths relative to repo root. Limits ESLint scope for speed. */
  touchedFiles: string[]
  /** When false, skip `lint:agent-contract` (use sparingly — only for ADR-only generators). */
  runAgentContract?: boolean
}

/**
 * Run the post-generation lint suite. Returns a status string Plop will
 * display in the action checklist.
 */
export function runPostGenLint(input: PostGenLintInput): string {
  const opts: Parameters<typeof execSync>[1] = {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      // Generators must never alter env-driven build caches — pass-through only.
      CI: process.env.CI ?? "0",
    },
  }

  if (input.runAgentContract !== false) {
    try {
      execSync("pnpm lint:agent-contract", opts)
    } catch {
      return "agent-contract lint failed — review output above and fix before continuing."
    }
  }

  const eslintTargets = (input.touchedFiles ?? [])
    .map((p) => path.relative(REPO_ROOT, path.resolve(REPO_ROOT, p)))
    .filter((p) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p))

  if (eslintTargets.length > 0) {
    // Quote each path to survive Windows backslashes / spaces.
    const quoted = eslintTargets
      .map((p) => `"${p.replace(/\\/g, "/")}"`)
      .join(" ")
    try {
      execSync(
        `pnpm exec eslint --fix --max-warnings 0 --report-unused-disable-directives ${quoted}`,
        opts
      )
    } catch {
      return "eslint --fix failed on generated files — review output above and fix before continuing."
    }
  }

  return `lint passed (${input.runAgentContract === false ? "eslint only" : "agent-contract + eslint"})`
}

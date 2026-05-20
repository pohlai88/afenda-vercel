#!/usr/bin/env node
/**
 * Human approval gate for every full-repo command (AGENTS.md §2).
 * Agents / non-TTY shells are blocked unless CI=true.
 *
 * Child Turbo tasks inherit AFENDA_HUMAN_FULL_CONFIRMED=1 after one YES.
 */
import { spawnSync } from "node:child_process"
import readline from "node:readline/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  FULL_COMMAND_META,
  LINT_FULL_TURBO_ARGS,
  VERIFY_NO_TEST_TURBO_ARGS,
  VERIFY_TURBO_ARGS,
} from "./lib/human-full-commands.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"

function isCiEnvironment() {
  return (
    process.env.CI === "true" ||
    process.env.CI === "1" ||
    Boolean(process.env.GITHUB_ACTIONS) ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.TURBO_CI)
  )
}

function skipConfirm() {
  return (
    isCiEnvironment() ||
    process.env.AFENDA_SKIP_FULL_VERIFY_CONFIRM === "1" ||
    process.env.AFENDA_HUMAN_FULL_CONFIRMED === "1"
  )
}

function childEnv() {
  return {
    ...process.env,
    AFENDA_HUMAN_FULL_CONFIRMED: "1",
  }
}

function meta(target) {
  return FULL_COMMAND_META[target] ?? FULL_COMMAND_META["lint:full"]
}

function printBlockedNonInteractive(target) {
  const m = meta(target)
  console.error(`
[afenda] BLOCKED: ${m.pnpmLabel} requires a human in an interactive terminal.

${m.summary}
Typical cost: ${m.cost} (${m.tier}). Not for the edit loop after every file change.

While coding (agents MUST use):
  ${m.l0}
  pnpm gate:typecheck
  pnpm test:fast -- tests/unit/<files>

Batch-fix: one full lap when ready to push → fix all failures by category → one re-run.

CI (GitHub Actions) runs verify:ci / job scripts with CI=true — no prompt.

Emergency bypass (human only — agents must NOT use):
  AFENDA_SKIP_FULL_VERIFY_CONFIRM=1 ${m.pnpmLabel}

Authority: AGENTS.md §2 — Human approval for full commands.
`)
}

function printPrompt(target) {
  const m = meta(target)
  console.log(`
[afenda] FULL command: ${m.pnpmLabel} (${m.tier}, ${m.cost})
${m.summary}

Edit-loop alternative: ${m.l0}
`)
}

async function askHumanConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  try {
    const answer = await rl.question(
      "Type YES to run this full command (anything else cancels): "
    )
    return answer.trim().toUpperCase() === "YES"
  } finally {
    rl.close()
  }
}

function runOrExit(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
    env: childEnv(),
  })
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runLintFullTurbo() {
  runOrExit("node", ["scripts/turbo-with-env.mjs", ...LINT_FULL_TURBO_ARGS])
}

function runVerifyTurbo() {
  runOrExit("node", ["scripts/turbo-with-env.mjs", ...VERIFY_TURBO_ARGS])
}

function runVerifyNoTestTurbo() {
  runOrExit("node", ["scripts/turbo-with-env.mjs", ...VERIFY_NO_TEST_TURBO_ARGS])
}

function runTypecheckFullExec() {
  runOrExit("pnpm", ["run", "typecheck"])
  runOrExit("pnpm", ["run", "typecheck:test"])
  runOrExit("pnpm", ["run", "typecheck:scripts"])
}

function runKnipExec() {
  runOrExit("pnpm", ["exec", "knip", "--no-progress", "--config", ".config/knip.json"])
}

function runTestCiExec() {
  runOrExit("node", [
    "scripts/with-env.mjs",
    "vitest",
    "run",
    "--config",
    ".config/vitest.config.ts",
    "--coverage",
  ])
}

function runTestCoverageExec() {
  runOrExit("node", [
    "scripts/with-env.mjs",
    "vitest",
    "run",
    "--config",
    ".config/vitest.config.ts",
    "--coverage",
  ])
}

function runBuildExec() {
  runOrExit("node", ["scripts/next-build-stable.mjs", "--webpack"])
}

function runTestE2eExec(smoke) {
  runBuildExec()
  const playwrightArgs = [
    "scripts/with-env.mjs",
    "playwright",
    "test",
    "--config",
    ".config/playwright.config.ts",
  ]
  if (smoke) {
    playwrightArgs.push("--grep", "@smoke")
  }
  runOrExit("node", playwrightArgs)
}

function runIntegrityStatic() {
  runLintFullTurbo()
  runTypecheckFullExec()
  runKnipExec()
  runOrExit("pnpm", ["run", "format:check"])
}

function runVerifyArtifact() {
  runLintFullTurbo()
  runOrExit("pnpm", ["run", "typecheck"])
  runBuildExec()
}

const RUNNERS = {
  lint: runLintFullTurbo,
  "lint:full": runLintFullTurbo,
  "typecheck:full": runTypecheckFullExec,
  knip: runKnipExec,
  "test:ci": runTestCiExec,
  "test:coverage": runTestCoverageExec,
  "test:audit": () => runOrExit("node", ["scripts/vitest-audit.mjs"]),
  build: runBuildExec,
  "test:e2e": () => runTestE2eExec(false),
  "test:e2e:smoke": () => runTestE2eExec(true),
  "verify:no-test": runVerifyNoTestTurbo,
  "integrity:static": runIntegrityStatic,
  "verify:artifact": runVerifyArtifact,
  smoke: runVerifyArtifact,
  verify: runVerifyTurbo,
  "verify:parallel": runVerifyTurbo,
  "gate:push": runVerifyTurbo,
  "gate:merge": () => {
    runVerifyTurbo()
    runBuildExec()
  },
}

async function main() {
  const target = process.argv[2]
  if (!target || !RUNNERS[target]) {
    console.error(
      `[confirm-human-full] Unknown target "${target ?? ""}". Known: ${Object.keys(RUNNERS).join(", ")}`
    )
    process.exit(1)
  }

  if (!skipConfirm()) {
    if (!process.stdin.isTTY) {
      printBlockedNonInteractive(target)
      process.exit(2)
    }
    printPrompt(target)
    const confirmed = await askHumanConfirmation()
    if (!confirmed) {
      console.error("\n[afenda] Cancelled — full command not started.")
      process.exit(1)
    }
    console.log("\n[afenda] Confirmed. Starting…\n")
  }

  RUNNERS[target]()
}

main().catch((error) => {
  console.error(
    `[confirm-human-full] ${error instanceof Error ? error.message : String(error)}`
  )
  process.exit(1)
})

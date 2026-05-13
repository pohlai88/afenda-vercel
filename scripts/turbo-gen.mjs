#!/usr/bin/env node
/**
 * Thin wrapper for `pnpm gen` so `pnpm gen action --module <slug>` maps to
 * Turborepo's positional `--args` contract (prompt order in turbo/generators/config.ts).
 *
 * @example
 * pnpm gen action --module hrm
 * pnpm gen action --module hrm --object payroll_run --verb create --tier A
 */
import { spawnSync } from "node:child_process"

const argv = process.argv.slice(2)

function parseModuleFlag() {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--module" && typeof argv[i + 1] === "string" && argv[i + 1]) {
      return { slug: argv[i + 1], consumed: [i, i + 1] }
    }
    if (a.startsWith("--module=") && a.length > "--module=".length) {
      return { slug: a.slice("--module=".length), consumed: [i] }
    }
  }
  return null
}

function buildTurboArgv() {
  if (argv[0] !== "action") {
    return ["gen", ...argv]
  }

  const mod = parseModuleFlag()
  if (!mod) {
    return ["gen", ...argv]
  }

  let object = "record"
  let verb = "create"
  let tier = "B"
  const skip = new Set(mod.consumed)
  const forward = []

  for (let i = 0; i < argv.length; i++) {
    if (skip.has(i)) continue
    const a = argv[i]
    if (a === "--object" && argv[i + 1]) {
      object = argv[++i]
      continue
    }
    if (a === "--verb" && argv[i + 1]) {
      verb = argv[++i]
      continue
    }
    if (a === "--tier" && argv[i + 1]) {
      tier = argv[++i]
      continue
    }
    if (a.startsWith("--object=")) {
      object = a.slice("--object=".length)
      continue
    }
    if (a.startsWith("--verb=")) {
      verb = a.slice("--verb=".length)
      continue
    }
    if (a.startsWith("--tier=")) {
      tier = a.slice("--tier=".length)
      continue
    }
    forward.push(a)
  }

  return [
    "gen",
    ...forward,
    "--args",
    mod.slug,
    "--args",
    object,
    "--args",
    verb,
    "--args",
    tier,
  ]
}

const turboArgv = buildTurboArgv()
const result = spawnSync("pnpm", ["exec", "turbo", ...turboArgv], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: true,
  env: process.env,
})

process.exit(result.status ?? 1)

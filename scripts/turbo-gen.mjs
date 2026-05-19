#!/usr/bin/env node
/**
 * Thin wrapper for `pnpm gen` so `pnpm gen action --module <slug>` maps to
 * Turborepo's positional `--args` contract (prompt order in turbo/generators/config.ts).
 *
 * @example
 * pnpm gen action --module hrm
 * pnpm gen action --module hrm --object payroll_run --verb create --tier A
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const argv = process.argv.slice(2)

if (argv[0] === "surface-draft") {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, "scripts", "gen-surface-draft.mjs"), ...argv.slice(1)],
    { stdio: "inherit", cwd: process.cwd(), env: process.env }
  )
  process.exit(result.status ?? 1)
}

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
  if (argv[0] === "ask-doc") {
    const pick = (flag) => {
      const eq = argv.find((a) => a.startsWith(`${flag}=`))
      if (eq) return eq.slice(flag.length + 1)
      const i = argv.indexOf(flag)
      if (i !== -1 && argv[i + 1]) return argv[i + 1]
      return null
    }
    const section = pick("--section")
    const slug = pick("--slug")
    const title = pick("--title")
    const description = pick("--description")
    const audience = pick("--audience")
    const status = pick("--status")
    const archetype = pick("--archetype") ?? "workflow"
    if (section && slug && title && description && audience && status) {
      return [
        "gen",
        "ask-doc",
        "--args",
        section,
        "--args",
        slug,
        "--args",
        title,
        "--args",
        description,
        "--args",
        audience,
        "--args",
        status,
        "--args",
        archetype,
      ]
    }
    return ["gen", ...argv]
  }

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

/** Quote for `cmd.exe` when `shell: true` must preserve spaces inside one `--args` value. */
function quoteCmdArg(value) {
  const s = String(value)
  if (!/[\s"]/u.test(s)) return s
  return `"${s.replace(/"/g, '""')}"`
}

function spawnTurbo() {
  const isAskDocWithArgs =
    turboArgv[0] === "gen" &&
    turboArgv[1] === "ask-doc" &&
    turboArgv.includes("--args")

  if (process.platform === "win32" && isAskDocWithArgs) {
    const cmd = ["pnpm", "exec", "turbo", ...turboArgv]
      .map(quoteCmdArg)
      .join(" ")
    return spawnSync(cmd, {
      stdio: "inherit",
      cwd: process.cwd(),
      shell: true,
      env: process.env,
    })
  }

  return spawnSync("pnpm", ["exec", "turbo", ...turboArgv], {
    stdio: "inherit",
    cwd: process.cwd(),
    shell: true,
    env: process.env,
  })
}

const result = spawnTurbo()

process.exit(result.status ?? 1)

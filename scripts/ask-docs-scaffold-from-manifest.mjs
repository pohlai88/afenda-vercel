#!/usr/bin/env node
/**
 * Batch-scaffold ask-docs pages from a JSON manifest.
 * Idempotent: skips entries whose MDX file already exists.
 *
 * @example
 * pnpm ask-docs:scaffold
 * pnpm ask-docs:scaffold -- --dry-run
 * pnpm ask-docs:validate-manifest
 * node scripts/ask-docs-scaffold-from-manifest.mjs --dry-run --manifest tests/fixtures/ask-docs-scaffold-dry-run.manifest.json
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  AskDocsManifestError,
  parseManifestFile,
  planScaffoldActions,
  summarizePlan,
  validateManifest,
} from "./lib/ask-docs-scaffold-manifest.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const defaultManifestPath = path.join(
  root,
  ".config",
  "ask-docs-scaffold.manifest.json"
)

function parseArgs(argv) {
  let manifestPath = defaultManifestPath
  let dryRun = false
  let validateOnly = false
  let jsonOutput = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--dry-run") {
      dryRun = true
      continue
    }
    if (arg === "--validate-only") {
      validateOnly = true
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`ask-docs:scaffold — batch scaffold from a JSON manifest

Flags:
  --validate-only   Validate manifest only (no gen)
  --dry-run         Print planned gen commands (no writes)
  --manifest <path> Manifest file (default: .config/ask-docs-scaffold.manifest.json)
  --json            Machine-readable plan on stdout
`)
      process.exit(0)
    }
    if (arg === "--json") {
      jsonOutput = true
      continue
    }
    if (arg === "--manifest" && argv[i + 1]) {
      const value = argv[++i]
      manifestPath = path.isAbsolute(value) ? value : path.join(root, value)
      continue
    }
    if (arg.startsWith("--manifest=")) {
      const value = arg.slice("--manifest=".length)
      manifestPath = path.isAbsolute(value) ? value : path.join(root, value)
    }
  }

  return { manifestPath, dryRun, validateOnly, jsonOutput }
}

function fail(message) {
  console.error(`ask-docs:scaffold: ${message}`)
  process.exit(1)
}

function quoteCmdArg(value) {
  const s = String(value)
  if (!/[\s"]/u.test(s)) return s
  return `"${s.replace(/"/g, '""')}"`
}

function runGen(entry) {
  const args = [
    "gen",
    "ask-doc",
    "--section",
    entry.section,
    "--slug",
    entry.slug,
    "--title",
    entry.title,
    "--description",
    entry.description,
    "--audience",
    entry.audience,
    "--status",
    entry.status,
    "--archetype",
    entry.archetype,
  ]

  if (process.platform === "win32") {
    const cmd = ["pnpm", ...args].map(quoteCmdArg).join(" ")
    return spawnSync(cmd, {
      stdio: "inherit",
      cwd: root,
      shell: true,
      env: process.env,
    })
  }

  return spawnSync("pnpm", args, {
    stdio: "inherit",
    cwd: root,
    shell: true,
    env: process.env,
  })
}

/**
 * @param {ReturnType<typeof planScaffoldActions>} plan
 * @param {{ dryRun: boolean, validateOnly: boolean, jsonOutput: boolean, manifestPath: string }} opts
 */
function emitPlan(plan, opts) {
  const summary = summarizePlan(plan)

  if (opts.jsonOutput) {
    console.log(
      JSON.stringify(
        {
          manifest: path.relative(root, opts.manifestPath),
          mode: opts.validateOnly
            ? "validate-only"
            : opts.dryRun
              ? "dry-run"
              : "scaffold",
          wouldCreate: summary.wouldCreate,
          skipped: summary.skipped,
          warnings: summary.warnings,
          actions: plan.map((action) => ({
            kind: action.kind,
            section: action.entry.section,
            slug: action.entry.slug,
            mdxPath: path.relative(root, action.mdxPath),
            genCommand: action.genCommand,
            warning: action.warning ?? null,
          })),
        },
        null,
        2
      )
    )
    return summary
  }

  if (opts.validateOnly) {
    console.log("ask-docs:scaffold: validate-only — no files will be written")
  } else if (opts.dryRun) {
    console.log("ask-docs:scaffold: dry-run — no files will be written")
  }

  for (const action of plan) {
    if (action.kind === "skipExists") {
      console.log(
        `ask-docs:scaffold: skip ${action.entry.section}/${action.entry.slug}.mdx (already exists)`
      )
    } else {
      console.log(
        `ask-docs:scaffold: would create ${action.entry.section}/${action.entry.slug}.mdx`
      )
      console.log(`  ${action.genCommand}`)
    }
    if (action.warning) {
      console.log(`  warn: ${action.warning}`)
    }
  }

  return summary
}

function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.dryRun && opts.validateOnly) {
    fail("use either --dry-run or --validate-only, not both")
  }

  const relManifest = path.relative(root, opts.manifestPath)

  let raw
  try {
    raw = parseManifestFile(opts.manifestPath)
  } catch (err) {
    if (err instanceof AskDocsManifestError) fail(err.message)
    throw err
  }

  if (raw.length === 0) {
    const message = `manifest is empty — nothing to do (${relManifest})`
    if (opts.jsonOutput) {
      console.log(
        JSON.stringify({
          manifest: relManifest,
          mode: opts.validateOnly ? "validate-only" : opts.dryRun ? "dry-run" : "scaffold",
          wouldCreate: 0,
          skipped: 0,
          warnings: [],
          actions: [],
        })
      )
    } else {
      console.log(`ask-docs:scaffold: ${message}`)
    }
    return
  }

  let entries
  try {
    entries = validateManifest(raw, root)
  } catch (err) {
    if (err instanceof AskDocsManifestError) fail(err.message)
    throw err
  }

  const plan = planScaffoldActions(entries, root)
  const summary = emitPlan(plan, opts)

  if (opts.validateOnly || opts.dryRun) {
    const label = opts.validateOnly ? "validate-only" : "dry-run"
    if (!opts.jsonOutput) {
      console.log(
        `ask-docs:scaffold: ${label} done (would_create=${summary.wouldCreate}, skipped=${summary.skipped}, warnings=${summary.warnings.length})`
      )
    }
    return
  }

  let created = 0
  let failed = 0

  for (const action of plan) {
    if (action.kind === "skipExists") continue

    console.log(
      `ask-docs:scaffold: create ${action.entry.section}/${action.entry.slug}.mdx`
    )
    const result = runGen(action.entry)
    if ((result.status ?? 1) !== 0) {
      failed++
      continue
    }
    created++
  }

  console.log(
    `ask-docs:scaffold: done (created=${created}, skipped=${summary.skipped}, failed=${failed})`
  )
  if (created > 0) {
    console.log("ask-docs:scaffold: Next: fill ADQS content, then pnpm ask-docs:check")
  }
  if (failed > 0) process.exit(1)
}

main()

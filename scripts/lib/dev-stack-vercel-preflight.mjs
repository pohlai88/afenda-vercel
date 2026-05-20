/**
 * Vercel SDK preflight for `pnpm dev:stack` — confirms link + project metadata.
 * Scripts-only; never import from app/ or lib/.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  AFENDA_VERCEL_PROJECT_ID,
  AFENDA_VERCEL_PROJECT_NAME,
  AFENDA_VERCEL_TEAM_ID,
  AFENDA_VERCEL_TEAM_SLUG,
} from "./dev-stack-constants.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")
const vercelCli = path.join(root, "node_modules", "vercel", "dist", "vc.js")

/** @typedef {{ ok: boolean; warnings: string[]; errors: string[]; project?: { name: string; framework?: string; nodeVersion?: string; latestDeploymentUrl?: string } }} PreflightResult */

/**
 * @param {{ strict?: boolean; envLocalPath?: string; skipVercelEnvDryRun?: boolean }} [options]
 * @returns {Promise<PreflightResult>}
 */
export async function runDevStackVercelPreflight(options = {}) {
  const strict = options.strict === true
  const skipVercelEnvDryRun = options.skipVercelEnvDryRun === true
  const envLocalPath = options.envLocalPath ?? path.join(root, ".env.local")
  /** @type {string[]} */
  const warnings = []
  /** @type {string[]} */
  const errors = []

  if (!fs.existsSync(envLocalPath)) {
    const msg =
      "Missing .env.local — run `pnpm env:sync` (or `vercel env pull` + merge) before dev:stack."
    if (strict) errors.push(msg)
    else warnings.push(msg)
  }

  const link = readVercelProjectJson()
  const teamId =
    process.env.VERCEL_TEAM_ID?.trim() || link?.orgId || AFENDA_VERCEL_TEAM_ID
  const projectId =
    process.env.VERCEL_PROJECT_ID?.trim() ||
    link?.projectId ||
    AFENDA_VERCEL_PROJECT_ID
  const teamSlug =
    process.env.VERCEL_TEAM_SLUG?.trim() || AFENDA_VERCEL_TEAM_SLUG
  const projectName = link?.projectName ?? AFENDA_VERCEL_PROJECT_NAME

  if (!link) {
    warnings.push(
      `No .vercel/project.json — run: vercel link --scope ${teamSlug} (project: ${projectName})`
    )
  }

  if (!link && !process.env.VERCEL_TOKEN && !process.env.VERCEL_ACCESS_TOKEN) {
    warnings.push(
      "No VERCEL_TOKEN — `vercel env run` may fail; use --no-vercel-env-run or `vercel login`."
    )
  }

  const token =
    process.env.VERCEL_TOKEN?.trim() || process.env.VERCEL_ACCESS_TOKEN?.trim()

  /** @type {PreflightResult["project"] | undefined} */
  let projectMeta

  if (token) {
    try {
      const { Vercel } = await import("@vercel/sdk")
      const vercel = new Vercel({ bearerToken: token })
      const project = await vercel.projects.getProject({
        idOrName: projectId ?? projectName,
        teamId,
        slug: teamSlug,
      })
      projectMeta = {
        name: project.name ?? projectName,
        framework: project.framework ?? undefined,
        nodeVersion: project.nodeVersion ?? undefined,
        latestDeploymentUrl: project.latestDeployment?.url ?? undefined,
      }
      if (project.framework && project.framework !== "nextjs") {
        warnings.push(
          `Vercel project framework is "${project.framework}" (expected nextjs).`
        )
      }
      const latest = project.latestDeployment
      if (latest?.readyState === "ERROR") {
        warnings.push(
          `Latest Vercel deployment is ERROR (${latest.url ?? latest.id}) — local dev:stack is unaffected; run \`vercel inspect ${latest.url ?? latest.id}\`.`
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (strict) {
        errors.push(`@vercel/sdk getProject failed: ${msg}`)
      } else {
        warnings.push(`@vercel/sdk getProject skipped: ${msg}`)
      }
    }
  } else if (strict) {
    errors.push(
      "VERCEL_TOKEN (or VERCEL_ACCESS_TOKEN) required in --strict mode for SDK preflight."
    )
  } else {
    warnings.push(
      "No VERCEL_TOKEN — SDK project check skipped (run `vercel login` for full preflight)."
    )
  }

  if (!skipVercelEnvDryRun && link && fs.existsSync(vercelCli)) {
    const dry = spawnSync(
      "node",
      [
        vercelCli,
        "env",
        "run",
        "-e",
        "development",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ],
      { cwd: root, shell: process.platform === "win32", stdio: "pipe" }
    )
    if (dry.status !== 0) {
      const hint =
        dry.stderr?.toString().trim().slice(0, 200) ||
        dry.stdout?.toString().trim().slice(0, 200) ||
        `exit ${dry.status}`
      warnings.push(
        `vercel env run dry-run failed (${hint}) — try \`vercel login\` or pnpm dev:stack --no-vercel-env-run`
      )
    }
  }

  const ok = errors.length === 0
  return { ok, warnings, errors, project: projectMeta }
}

/** @returns {{ projectId?: string; orgId?: string; projectName?: string } | null} */
function readVercelProjectJson() {
  const p = path.join(root, ".vercel", "project.json")
  if (!fs.existsSync(p)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"))
    return {
      projectId: typeof raw.projectId === "string" ? raw.projectId : undefined,
      orgId: typeof raw.orgId === "string" ? raw.orgId : undefined,
      projectName:
        typeof raw.projectName === "string" ? raw.projectName : undefined,
    }
  } catch {
    return null
  }
}

/**
 * CLI entry: `node scripts/lib/dev-stack-vercel-preflight.mjs [--strict]`
 */
async function main() {
  const strict = process.argv.includes("--strict")
  const result = await runDevStackVercelPreflight({ strict })
  for (const w of result.warnings) {
    console.warn(`[dev:stack:preflight] warn: ${w}`)
  }
  for (const e of result.errors) {
    console.error(`[dev:stack:preflight] error: ${e}`)
  }
  if (result.project) {
    console.log(
      `[dev:stack:preflight] project=${result.project.name} framework=${result.project.framework ?? "?"} node=${result.project.nodeVersion ?? "?"}`
    )
    if (result.project.latestDeploymentUrl) {
      console.log(
        `[dev:stack:preflight] latest=${result.project.latestDeploymentUrl}`
      )
    }
  }
  process.exit(result.ok ? 0 : 1)
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isDirectRun) {
  await main()
}

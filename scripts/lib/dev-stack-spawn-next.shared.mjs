/**
 * Spawn Next dev with optional `vercel env run` wrapper (shared by dev-stack + run-next-dev).
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  AFENDA_DEV_UI_DIST,
  AFENDA_DEV_UI_PORT,
  AFENDA_DEV_WORKFLOW_DIST,
  AFENDA_DEV_WORKFLOW_PORT,
} from "./dev-stack-constants.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")
const vercelCli = path.join(root, "node_modules", "vercel", "dist", "vc.js")

/** @typedef {"ui" | "workflow"} DevRole */

/**
 * @param {DevRole} role
 * @returns {{ port: number; distDir: string; envFile: string; fileOverrides: boolean }}
 */
export function devRoleConfig(role) {
  if (role === "workflow") {
    return {
      port: AFENDA_DEV_WORKFLOW_PORT,
      distDir: AFENDA_DEV_WORKFLOW_DIST,
      envFile: ".env.workflow.local",
      fileOverrides: true,
    }
  }
  return {
    port: AFENDA_DEV_UI_PORT,
    distDir: AFENDA_DEV_UI_DIST,
    envFile: ".env.local",
    fileOverrides: false,
  }
}

/**
 * @param {{ role: DevRole; useVercelEnvRun?: boolean }} opts
 * @returns {{ command: string; args: string[]; distDir: string; warnedNoVercel: boolean }}
 */
export function buildNextDevCommand(opts) {
  const cfg = devRoleConfig(opts.role)
  const useVercelEnvRun = opts.useVercelEnvRun !== false
  const warnedNoVercel = useVercelEnvRun && !fs.existsSync(vercelCli)

  const withEnvArgs = [
    "scripts/with-env.mjs",
    `--env-file=${cfg.envFile}`,
    ...(cfg.fileOverrides ? ["--file-overrides"] : []),
    "pnpm",
    "exec",
    "next",
    "dev",
    "--turbopack",
    "-p",
    String(cfg.port),
  ]

  const useVercelWrapper = useVercelEnvRun && fs.existsSync(vercelCli)
  const args = useVercelWrapper
    ? [vercelCli, "env", "run", "-e", "development", "--", "node", ...withEnvArgs]
    : withEnvArgs

  return {
    command: "node",
    args,
    distDir: cfg.distDir,
    warnedNoVercel,
  }
}

/**
 * @param {{
 *   role: DevRole;
 *   useVercelEnvRun?: boolean;
 *   label?: string;
 * }} opts
 * @returns {import('node:child_process').ChildProcess}
 */
export function spawnNextDevServer(opts) {
  const label = opts.label ?? opts.role
  const built = buildNextDevCommand(opts)

  if (built.warnedNoVercel) {
    console.warn(
      `[${label}] vercel CLI not found — starting without vercel env run.`
    )
  }

  return spawn(built.command, built.args, {
    cwd: root,
    shell: process.platform === "win32",
    stdio: "inherit",
    env: {
      ...process.env,
      AFENDA_NEXT_DIST_DIR: built.distDir,
    },
  })
}

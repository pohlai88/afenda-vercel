#!/usr/bin/env node
/**
 * Narrow prose gate for help-docs MDX files under content/help-docs only.
 * Uses markdownlint-cli2 — see `.config/markdownlint-help-docs.jsonc`.
 */
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = fileURLToPath(new URL("..", import.meta.url))
const config = path.join(root, ".config", "markdownlint-help-docs.jsonc")
const bin = path.join(
  root,
  "node_modules",
  "markdownlint-cli2",
  "markdownlint-cli2-bin.mjs"
)
const globs = ["content/help-docs/**/*.mdx"]

const result = spawnSync(
  process.execPath,
  [bin, "--config", config, ...globs],
  {
    cwd: root,
    stdio: "inherit",
    shell: false,
  }
)

process.exit(result.status ?? 1)

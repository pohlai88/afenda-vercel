#!/usr/bin/env node
/**
 * Narrow prose gate for ask-docs MDX files under content/ask-docs only.
 * Uses markdownlint-cli2 — see `.config/markdownlint-ask-docs.jsonc`.
 */
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = fileURLToPath(new URL("..", import.meta.url))
const config = path.join(root, ".config", "markdownlint-ask-docs.jsonc")
const bin = path.join(
  root,
  "node_modules",
  "markdownlint-cli2",
  "markdownlint-cli2-bin.mjs"
)
const globs = ["content/ask-docs/**/*.mdx"]

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

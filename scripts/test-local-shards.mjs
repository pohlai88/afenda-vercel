/**
 * Run Vitest in parallel local shards (no coverage), then merge blob reports.
 * Use on high-core machines when a single Vite main thread becomes the bottleneck.
 *
 *   pnpm test:local-shards
 *   SHARD_TOTAL=4 VITEST_MAX_WORKERS=7 pnpm test:local-shards
 *
 * See docs/testing/erp-test-scale-strategy.md and Vitest sharding guide.
 */
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { mergeChildEnv } from "./lib/merge-env.shared.mjs"
import {
  ensureVitestBlobReportsLink,
  VITEST_BLOB_REPORTS_DIR,
} from "./lib/vitest-blob-reports.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const vitestEntry = path.join(root, "node_modules", "vitest", "vitest.mjs")
const withEnv = path.join(root, "scripts", "with-env.mjs")

const shardTotal = Number.parseInt(process.env.SHARD_TOTAL ?? "4", 10)
const maxWorkers = process.env.VITEST_MAX_WORKERS ?? "7"

function runNode(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env,
      stdio: "inherit",
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`exit ${code}`))
    })
  })
}

async function main() {
  ensureVitestBlobReportsLink(root)

  const childEnv = mergeChildEnv({}, process.env, {
    VITEST_MAX_WORKERS: maxWorkers,
  })

  const shards = []
  for (let index = 1; index <= shardTotal; index += 1) {
    shards.push(
      runNode(
        [
          withEnv,
          vitestEntry,
          "run",
          "--config",
          ".config/vitest.config.ts",
          "--reporter=blob",
          `--shard=${index}/${shardTotal}`,
        ],
        childEnv
      )
    )
  }

  console.log(
    `[test:local-shards] ${shardTotal} shards · VITEST_MAX_WORKERS=${maxWorkers}`
  )
  await Promise.all(shards)

  await runNode(
    [
      withEnv,
      vitestEntry,
      "run",
      "--config",
      ".config/vitest.config.ts",
      `--merge-reports=${VITEST_BLOB_REPORTS_DIR}`,
    ],
    childEnv
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

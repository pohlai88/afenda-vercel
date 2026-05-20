/**
 * Ensures `.vitest-reports` → `.artifacts/vitest-reports` (Vitest blob reporter target).
 * Run before `test:ci:shard`, `test:local-shards`, and CI merge jobs.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

import { ensureVitestBlobReportsLink } from "./lib/vitest-blob-reports.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

ensureVitestBlobReportsLink(root)

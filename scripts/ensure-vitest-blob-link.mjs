/**
 * @deprecated Prefer `pnpm artifacts:init` (`scripts/ensure-artifacts-layout.mjs`).
 * Kept for scripts that only need the Vitest blob junction.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

import { ensureVitestBlobReportsLink } from "./lib/vitest-blob-reports.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

ensureVitestBlobReportsLink(root)

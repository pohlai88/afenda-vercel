/**
 * Ensures `.artifacts/` layout (logs/, reports/, playwright/) and Vitest blob junction.
 * Run after clone/pull or when Playwright/Vitest writes to legacy paths.
 *
 *   node scripts/ensure-artifacts-layout.mjs
 *   pnpm artifacts:init
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  ensureArtifactsSubdirs,
  migrateLegacyFlatArtifacts,
} from "./lib/artifacts-paths.shared.mjs"
import { ensureVitestBlobReportsLink } from "./lib/vitest-blob-reports.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

ensureArtifactsSubdirs(root)
migrateLegacyFlatArtifacts(root)
ensureVitestBlobReportsLink(root)

console.log(
  "[artifacts:init] .artifacts layout ready (logs/, reports/, playwright/, vitest-reports junction)"
)

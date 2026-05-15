import { rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const workflowOutputDir = path.join(repoRoot, "app", ".well-known", "workflow")

try {
  await rm(workflowOutputDir, {
    force: true,
    recursive: true,
    maxRetries: 5,
    retryDelay: 200,
  })
} catch (error) {
  console.error(
    `[clean-workflow-generated] failed to remove ${workflowOutputDir}:`,
    error
  )
  process.exitCode = 1
}

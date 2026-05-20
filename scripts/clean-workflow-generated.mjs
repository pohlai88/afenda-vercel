import path from "node:path"
import { fileURLToPath } from "node:url"

import { cleanWorkflowGenerated } from "./lib/dev-stack-bootstrap.shared.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

try {
  await cleanWorkflowGenerated({ root })
} catch (error) {
  console.error("[clean-workflow-generated] failed:", error)
  process.exit(1)
}

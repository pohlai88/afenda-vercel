import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { ensureWorkflowEnvFile } from "../../scripts/sync-env-workflow.mjs"

describe("ensureWorkflowEnvFile", () => {
  /** @type {string[]} */
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it("skips when .env.workflow.local exists and force is false", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "afenda-dev-stack-"))
    tempDirs.push(dir)
    fs.writeFileSync(
      path.join(dir, ".env.local"),
      "BETTER_AUTH_URL=http://localhost:3000\n"
    )
    fs.writeFileSync(path.join(dir, ".env.workflow.local"), "existing=1\n")

    const result = ensureWorkflowEnvFile({ root: dir, force: false })
    expect(result.status).toBe("skipped")
    expect(fs.readFileSync(path.join(dir, ".env.workflow.local"), "utf8")).toBe(
      "existing=1\n"
    )
  })

  it("writes workflow env with port rewrite when missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "afenda-dev-stack-"))
    tempDirs.push(dir)
    fs.writeFileSync(
      path.join(dir, ".env.local"),
      "BETTER_AUTH_URL=http://localhost:3000\n"
    )

    const result = ensureWorkflowEnvFile({ root: dir, force: false })
    expect(result.status).toBe("wrote")
    const dest = fs.readFileSync(path.join(dir, ".env.workflow.local"), "utf8")
    expect(dest).toContain("BETTER_AUTH_URL=http://localhost:3002")
  })
})

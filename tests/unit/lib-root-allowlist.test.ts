/**
 * Mirrors scripts/check-agent-contract.mjs LIB_ROOT_ALLOWLIST (AGENTS.md §6.1).
 * Run via `pnpm test:fast tests/unit/lib-root-allowlist.test.ts`
 */
import { readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../..")
const libRoot = join(repoRoot, "lib")

const LIB_ROOT_ALLOWLIST = [
  "auth-client.ts",
  "org-apps-module-paths.ts",
  "design-system.ts",
  "logger.server.ts",
  "session-cache.ts",
  "site.ts",
  "utils.ts",
] as const

describe("lib/ root allowlist (AGENTS.md §6.1)", () => {
  it("has exactly the eight allowlisted .ts files at lib/ root", () => {
    const onDisk = readdirSync(libRoot, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
      .map((e) => e.name)
      .sort()

    expect(onDisk).toEqual([...LIB_ROOT_ALLOWLIST].sort())
  })
})

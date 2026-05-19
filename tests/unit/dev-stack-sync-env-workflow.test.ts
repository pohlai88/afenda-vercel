import { describe, expect, it } from "vitest"

import { rewriteDevPorts } from "../../scripts/sync-env-workflow.mjs"

describe("rewriteDevPorts", () => {
  it("rewrites localhost and 127.0.0.1 dev URLs from 3000 to 3002", () => {
    expect(rewriteDevPorts("http://localhost:3000")).toBe(
      "http://localhost:3002"
    )
    expect(rewriteDevPorts("http://127.0.0.1:3000/api/auth")).toBe(
      "http://127.0.0.1:3002/api/auth"
    )
  })

  it("leaves unrelated values unchanged", () => {
    expect(rewriteDevPorts("postgresql://localhost:5432/db")).toBe(
      "postgresql://localhost:5432/db"
    )
  })
})

import { describe, expect, it } from "vitest"

import {
  buildLynxNlDemoExplainSqlSystemPrompt,
  buildLynxNlDemoGenerateSqlSystemPrompt,
} from "#features/lynx/data/nl-sql-demo-prompt.server"

describe("nl-sql-demo prompts", () => {
  it("injects organization id into generate prompt", () => {
    const org = "org-aaaaaaaa-bbbb-cccc-dddddddddddd"
    const sys = buildLynxNlDemoGenerateSqlSystemPrompt(org)
    expect(sys).toContain(org)
    expect(sys).toContain("lynx_demo_unicorn")
    expect(sys).toContain('"organizationId"')
  })

  it("explain prompt references demo table", () => {
    const sys = buildLynxNlDemoExplainSqlSystemPrompt()
    expect(sys).toContain("lynx_demo_unicorn")
  })
})

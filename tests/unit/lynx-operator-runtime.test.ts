import { afterEach, describe, expect, it, vi } from "vitest"

// Deep-import Lynx server modules and mock downstream feature barrels so Vitest
// (node) does not load contacts/knowledge/org-admin UI barrels (next-intl).
// Tests are exempt from the app/components/hooks/lib deep-import lint.
vi.mock("#features/contacts", () => ({
  countContactsForOrganization: vi.fn(async () => 0),
  listRecentContactsForOrganization: vi.fn(async () => []),
}))

vi.mock("#features/knowledge", () => ({
  embedKnowledgeText: vi.fn(async () => []),
  findSimilarKnowledgeChunks: vi.fn(async () => []),
  listRecentKnowledgeChunks: vi.fn(async () => []),
}))

vi.mock("#features/org-admin", () => ({
  countActiveImportJobsForOrganization: vi.fn(async () => 0),
}))

import { LYNX_OPERATOR_TOOL_IDS } from "#features/lynx/constants"
import {
  createLynxOperatorRuntime,
  type LynxOperatorRuntime,
} from "#features/lynx/data/operator-runtime.server"
import { registryToolIds } from "#features/lynx/data/operator-tool-registry.server"
import { createLynxOperatorToolRegistry } from "#features/lynx/data/operator-tools.server"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Lynx operator runtime", () => {
  const orgId = "00000000-0000-4000-8000-000000000001"

  it("registry tool ids match compile-time tuple", () => {
    const registry = createLynxOperatorToolRegistry(orgId)
    expect(registryToolIds(registry)).toEqual([...LYNX_OPERATOR_TOOL_IDS])
  })

  it("Phase-1 invariant: read-only, low-risk tools", () => {
    const registry = createLynxOperatorToolRegistry(orgId)
    for (const def of registry) {
      expect(def.access).toBe("read")
      expect(def.risk).toBe("low")
    }
  })

  it("each governed tool schema accepts safe payloads", () => {
    const registry = createLynxOperatorToolRegistry(orgId)
    for (const def of registry) {
      const sample =
        def.id === "org_recent_contacts"
          ? { limit: 3 }
          : def.id === "org_recent_knowledge_chunks"
            ? { limit: 4 }
            : def.id === "org_search_knowledge"
              ? { query: "test", topK: 3 }
              : {}
      const parsed = def.schema.safeParse(sample)
      expect(parsed.success, `schema ${def.id}`).toBe(true)
    }
  })

  it("returns null when no language model env is configured", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "")
    vi.stubEnv("OPENAI_API_KEY", "")
    expect(createLynxOperatorRuntime({ organizationId: orgId })).toBeNull()
  })

  it("runtime surface is opaque (no agent/tools/registry keys)", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "")
    vi.stubEnv(
      "OPENAI_API_KEY",
      "sk-test-lynx-operator-runtime-unit-placeholder"
    )
    const rt = createLynxOperatorRuntime({ organizationId: orgId })
    expect(rt).not.toBeNull()
    if (!rt) return
    expect(rt).not.toHaveProperty("agent")
    expect(rt).not.toHaveProperty("tools")
    expect(rt).not.toHaveProperty("registry")
    expect(typeof rt.stream).toBe("function")
    type AllowedKeys = keyof LynxOperatorRuntime
    const keys = Object.keys(rt) as AllowedKeys[]
    expect(keys.sort()).toEqual(
      ["executionMode", "providerOptions", "stream", "toolIds"].sort()
    )
  })
})

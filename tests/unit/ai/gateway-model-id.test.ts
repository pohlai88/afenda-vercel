import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { normalizeGatewayModelId } from "#lib/ai/gateway.server"

describe("normalizeGatewayModelId", () => {
  it("passes through provider/model ids", () => {
    expect(normalizeGatewayModelId("anthropic/claude-sonnet-4.6")).toBe(
      "anthropic/claude-sonnet-4.6"
    )
  })

  it("prefixes bare model names with openai/", () => {
    expect(normalizeGatewayModelId("text-embedding-3-small")).toBe(
      "openai/text-embedding-3-small"
    )
    expect(normalizeGatewayModelId("gpt-4o-mini")).toBe("openai/gpt-4o-mini")
  })
})

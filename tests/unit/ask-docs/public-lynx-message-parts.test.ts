import { describe, expect, it } from "vitest"

import {
  extractPublicLynxMessageText,
  extractPublicLynxSearchToolCalls,
} from "#lib/ask-docs/public-lynx-message-parts.shared"
import type { ChatUIMessage } from "#lib/ask-docs/public-lynx.shared"

describe("public-lynx message parts", () => {
  it("extracts only text parts for display", () => {
    const parts: ChatUIMessage["parts"] = [
      {
        type: "data-client",
        data: { location: "https://example.com/en/ask-docs" },
      },
      { type: "text", text: "Hello Lynx" },
    ]
    expect(extractPublicLynxMessageText(parts)).toBe("Hello Lynx")
  })

  it("collects search tool invocations by tool name", () => {
    const parts = [
      {
        type: "tool-search",
        toolCallId: "call-1",
        state: "output-available",
        input: { query: "foo" },
        output: [{ doc: { url: "/en/ask-docs/foo", title: "Foo" } }],
      },
    ] as ChatUIMessage["parts"]

    const calls = extractPublicLynxSearchToolCalls(parts)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.toolCallId).toBe("call-1")
  })
})

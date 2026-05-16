import { describe, expect, it } from "vitest"

import { buildPublicLynxConversationTranscript } from "#lib/ask-docs/public-lynx-transcript.shared"
import type { ChatUIMessage } from "#lib/ask-docs/public-lynx.shared"

describe("buildPublicLynxConversationTranscript", () => {
  it("formats user and assistant turns as markdown", () => {
    const messages = [
      {
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "What is Afenda?" }],
      },
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "Afenda is an ERP platform." }],
      },
    ] as const satisfies readonly ChatUIMessage[]

    expect(buildPublicLynxConversationTranscript([...messages])).toBe(
      "**You:**\nWhat is Afenda?\n\n**Lynx:**\nAfenda is an ERP platform."
    )
  })

  it("omits system messages and empty text parts", () => {
    const messages = [
      { id: "0", role: "system", parts: [{ type: "text", text: "hidden" }] },
      { id: "1", role: "user", parts: [{ type: "text", text: "  " }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "ok" }] },
    ] as const satisfies readonly ChatUIMessage[]

    expect(buildPublicLynxConversationTranscript([...messages])).toBe(
      "**Lynx:**\nok"
    )
  })
})

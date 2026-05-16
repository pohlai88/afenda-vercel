import { describe, expect, it } from "vitest"

import {
  buildPublicLynxClientContextPart,
  buildPublicLynxUserMessage,
  resolveAskDocsLocaleFromMessages,
} from "#lib/ask-docs/public-lynx-client-context.shared"
import type { ChatUIMessage } from "#lib/ask-docs/public-lynx.shared"

describe("buildPublicLynxClientContextPart", () => {
  it("returns an empty location when window is unavailable", () => {
    expect(buildPublicLynxClientContextPart()).toEqual({
      type: "data-client",
      data: { location: "" },
    })
  })
})

describe("buildPublicLynxUserMessage", () => {
  it("includes client context and trimmed user text", () => {
    expect(buildPublicLynxUserMessage("What is Afenda?")).toEqual({
      role: "user",
      parts: [
        { type: "data-client", data: { location: "" } },
        { type: "text", text: "What is Afenda?" },
      ],
    })
  })
})

describe("resolveAskDocsLocaleFromMessages", () => {
  it("reads locale from the client location URL", () => {
    const messages: ChatUIMessage[] = [
      {
        id: "1",
        role: "user",
        parts: [
          {
            type: "data-client",
            data: {
              location: "https://afenda.test/en/ask-docs/leave",
            },
          },
          { type: "text", text: "How does leave work?" },
        ],
      },
    ]

    expect(resolveAskDocsLocaleFromMessages(messages)).toBe("en")
  })

  it("falls back to the default locale when context is missing", () => {
    expect(resolveAskDocsLocaleFromMessages([])).toBe("en")
  })
})

import { describe, expect, it } from "vitest"

import en from "../../../messages/en.json"
import {
  formatPublicLynxChatError,
  resolvePublicLynxChatErrorKey,
} from "#lib/ask-docs/public-lynx-error.shared"

describe("resolvePublicLynxChatErrorKey", () => {
  it("maps rate-limit errors", () => {
    expect(
      resolvePublicLynxChatErrorKey(new Error("HTTP 429 Too Many Requests"))
    ).toBe("errors.rateLimit")
    expect(en.AskLynx.errors.rateLimit).toContain("Too many questions")
  })

  it("maps configuration errors", () => {
    expect(
      resolvePublicLynxChatErrorKey(
        new Error("503 Ask Lynx is not configured.")
      )
    ).toBe("errors.unavailable")
  })

  it("maps network failures", () => {
    expect(resolvePublicLynxChatErrorKey(new Error("Failed to fetch"))).toBe(
      "errors.network"
    )
  })

  it("maps abort to stopped copy", () => {
    expect(resolvePublicLynxChatErrorKey(new Error("Request aborted"))).toBe(
      "errors.aborted"
    )
  })

  it("maps payload-too-large errors", () => {
    expect(
      resolvePublicLynxChatErrorKey(new Error("HTTP 413 Payload Too Large"))
    ).toBe("errors.tooLong")
  })

  it("maps search-unavailable tool failures", () => {
    expect(
      resolvePublicLynxChatErrorKey(
        new Error("Documentation search is temporarily unavailable.")
      )
    ).toBe("errors.searchUnavailable")
  })

  it("falls back to generic for technical messages", () => {
    expect(
      resolvePublicLynxChatErrorKey(
        new Error("TypeError: Cannot read properties of undefined")
      )
    ).toBe("errors.generic")
  })
})

describe("formatPublicLynxChatError", () => {
  it("returns English copy aligned with AskLynx.errors", () => {
    expect(
      formatPublicLynxChatError(new Error("HTTP 429 Too Many Requests"))
    ).toBe(en.AskLynx.errors.rateLimit)
  })
})

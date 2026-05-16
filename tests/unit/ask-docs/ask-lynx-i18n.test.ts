import { describe, expect, it } from "vitest"

import en from "../../../messages/en.json"
import ms from "../../../messages/ms.json"
import vi from "../../../messages/vi.json"
import zh from "../../../messages/zh-CN.json"

const locales = [
  { id: "en", messages: en },
  { id: "zh-CN", messages: zh },
  { id: "vi", messages: vi },
  { id: "ms", messages: ms },
] as const

describe("AskLynx message catalog parity", () => {
  it("every locale exposes the same AskLynx keys as en", () => {
    const enKeys = Object.keys(en.AskLynx).sort()
    for (const { id, messages } of locales) {
      expect(Object.keys(messages.AskLynx).sort(), id).toEqual(enKeys)
      expect(
        Object.keys(messages.AskLynx.prompts).sort(),
        `${id}.prompts`
      ).toEqual(Object.keys(en.AskLynx.prompts).sort())
      expect(
        Object.keys(messages.AskLynx.errors).sort(),
        `${id}.errors`
      ).toEqual(Object.keys(en.AskLynx.errors).sort())
    }
  })

  it("zh-CN provides localized panel title", () => {
    expect(zh.AskLynx.title).not.toBe(en.AskLynx.title)
    expect(zh.AskLynx.inputPlaceholder).toContain("Lynx")
  })
})

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { FULL_APP_LOCALES } from "#lib/i18n/locales.shared"

describe("ASK_DOCS_ORAMA_LOCALE_MAP", () => {
  it("defines an entry for every FullAppLocale", async () => {
    const { ASK_DOCS_ORAMA_LOCALE_MAP } =
      await import("#lib/ask-docs/orama-locale-map.server")
    for (const locale of FULL_APP_LOCALES) {
      expect(ASK_DOCS_ORAMA_LOCALE_MAP[locale]).toBeDefined()
    }
  })

  it("uses the Mandarin tokenizer for zh-CN", async () => {
    const { ASK_DOCS_ORAMA_LOCALE_MAP } =
      await import("#lib/ask-docs/orama-locale-map.server")
    const zh = ASK_DOCS_ORAMA_LOCALE_MAP["zh-CN"]
    expect("components" in zh && zh.components.tokenizer).toBeTruthy()
  })
})

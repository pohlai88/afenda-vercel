import { describe, expect, it } from "vitest"

import { buildClientCookieString } from "#lib/browser/client-cookie.shared"

describe("buildClientCookieString", () => {
  it("adds baseline first-party preference cookie attributes", () => {
    expect(
      buildClientCookieString({
        name: "sidebar_width",
        value: 280,
        maxAgeSeconds: 604800,
        secure: false,
      })
    ).toBe("sidebar_width=280; Path=/; Max-Age=604800; SameSite=Lax")
  })

  it("adds Secure when requested", () => {
    expect(
      buildClientCookieString({
        name: "inspector_state",
        value: true,
        maxAgeSeconds: 604800,
        secure: true,
      })
    ).toBe("inspector_state=true; Path=/; Max-Age=604800; SameSite=Lax; Secure")
  })

  it("encodes cookie values", () => {
    expect(
      buildClientCookieString({
        name: "example",
        value: "a b",
        maxAgeSeconds: 60,
        secure: false,
      })
    ).toContain("example=a%20b")
  })

  it("rejects SameSite=None without Secure", () => {
    expect(() =>
      buildClientCookieString({
        name: "cross_site",
        value: "1",
        maxAgeSeconds: 60,
        sameSite: "None",
        secure: false,
      })
    ).toThrow("SameSite=None cookies must also use Secure.")
  })
})

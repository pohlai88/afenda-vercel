import { describe, expect, it } from "vitest"

import { pickSignInShellMessages } from "../../lib/i18n/auth-shell-messages.shared"

describe("pickSignInShellMessages", () => {
  it("keeps Auth and AuthStatus when present", () => {
    const picked = pickSignInShellMessages({
      Auth: { a: "1" },
      AuthStatus: { b: "2" },
      Other: { c: "3" },
    })
    expect(picked).toEqual({
      Auth: { a: "1" },
      AuthStatus: { b: "2" },
    })
  })

  it("omits missing namespaces", () => {
    expect(pickSignInShellMessages({ Auth: { x: "y" } })).toEqual({
      Auth: { x: "y" },
    })
  })
})

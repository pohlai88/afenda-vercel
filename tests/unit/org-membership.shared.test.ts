import { describe, expect, it } from "vitest"

import { mapIamSessionUser } from "#lib/auth/org-membership.shared"

describe("org-membership.server mapIamSessionUser", () => {
  it("normalizes nullable name and role fields", () => {
    expect(
      mapIamSessionUser({
        id: "user-1",
        email: "a@example.com",
        name: undefined,
        role: undefined,
      })
    ).toEqual({
      userId: "user-1",
      user: {
        email: "a@example.com",
        name: null,
        role: null,
      },
    })
  })
})

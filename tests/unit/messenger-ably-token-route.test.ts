import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getOrgSessionFromRequestMock,
  createMessengerAblyTokenRequestMock,
  assertMessengerRoomMembershipMock,
} = vi.hoisted(() => ({
  getOrgSessionFromRequestMock: vi.fn(),
  createMessengerAblyTokenRequestMock: vi.fn(),
  assertMessengerRoomMembershipMock: vi.fn(),
}))

vi.mock("#lib/auth", () => ({
  getOrgSessionFromRequest: getOrgSessionFromRequestMock,
}))

vi.mock("#features/messenger/server", () => ({
  createMessengerAblyTokenRequest: createMessengerAblyTokenRequestMock,
  assertMessengerRoomMembership: assertMessengerRoomMembershipMock,
}))

import { POST } from "../../app/api/erp/messenger/auth/route"

describe("api/erp/messenger/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without org session", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue(null)
    const res = await POST(
      new Request("https://app.test/api/erp/messenger/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(401)
    expect(createMessengerAblyTokenRequestMock).not.toHaveBeenCalled()
  })

  it("mints a token scoped to the org private messenger channel", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
      organizationId: "org-uuid-1",
      user: { email: "u@example.com", name: "U", role: "member" },
    })
    createMessengerAblyTokenRequestMock.mockResolvedValue({
      keyName: "abc",
      ttl: 3600,
      capability: { "private-messenger:org-uuid-1": ["subscribe"] },
      clientId: "user-1",
      timestamp: 1,
      nonce: "n",
      mac: "m",
    })

    const res = await POST(
      new Request("https://app.test/api/erp/messenger/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )

    expect(res.status).toBe(200)
    expect(createMessengerAblyTokenRequestMock).toHaveBeenCalledWith({
      organizationId: "org-uuid-1",
      clientId: "user-1",
    })
    const json = (await res.json()) as { capability?: Record<string, unknown> }
    expect(json.capability).toEqual({
      "private-messenger:org-uuid-1": ["subscribe"],
    })
  })

  it("returns 403 when roomId is not a membership for this user", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
      organizationId: "org-uuid-1",
      user: { email: "u@example.com", name: "U", role: "member" },
    })
    assertMessengerRoomMembershipMock.mockResolvedValue(false)

    const res = await POST(
      new Request("https://app.test/api/erp/messenger/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId: "room-x" }),
      })
    )

    expect(res.status).toBe(403)
    expect(createMessengerAblyTokenRequestMock).not.toHaveBeenCalled()
  })
})

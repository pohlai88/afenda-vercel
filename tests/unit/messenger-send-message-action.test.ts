import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  requireOrgSessionMock,
  assertMessengerRoomMembershipMock,
  insertMock,
  updateMock,
  writeIamAuditEventFromNextHeadersMock,
  publishMessengerOrgEventMock,
} = vi.hoisted(() => ({
  requireOrgSessionMock: vi.fn(),
  assertMessengerRoomMembershipMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  writeIamAuditEventFromNextHeadersMock: vi.fn(),
  publishMessengerOrgEventMock: vi.fn(),
}))

vi.mock("#lib/tenant", () => ({
  requireOrgSession: requireOrgSessionMock,
}))

vi.mock("#lib/db", () => ({
  db: {
    insert: insertMock,
    update: updateMock,
  },
}))

vi.mock("#lib/auth", () => ({
  writeIamAuditEventFromNextHeaders: writeIamAuditEventFromNextHeadersMock,
}))

vi.mock("#features/messenger/data/messenger.queries.server", () => ({
  assertMessengerRoomMembership: assertMessengerRoomMembershipMock,
  listMessengerMessagesForRoom: vi.fn(),
  listMessengerRoomsForUser: vi.fn(),
}))

vi.mock("#features/messenger/data/messenger.ably-server", () => ({
  publishMessengerOrgEvent: publishMessengerOrgEventMock,
}))

import { sendMessengerMessageAction } from "../../lib/features/messenger/actions/messenger.actions"

describe("sendMessengerMessageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    publishMessengerOrgEventMock.mockResolvedValue(undefined)
    writeIamAuditEventFromNextHeadersMock.mockResolvedValue(undefined)
    requireOrgSessionMock.mockResolvedValue({
      userId: "author-1",
      sessionId: "sess-1",
      organizationId: "org-1",
      user: { email: "a@example.com", name: "A", role: "member" },
    })
    assertMessengerRoomMembershipMock.mockResolvedValue(true)

    const insertReturningMock = vi.fn().mockResolvedValue([
      {
        id: "msg-1",
        roomId: "room-1",
        organizationId: "org-1",
        authorUserId: "author-1",
        body: "hello",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ])

    insertMock.mockImplementation(() => ({
      values: vi.fn().mockReturnThis(),
      returning: insertReturningMock,
    }))

    updateMock.mockImplementation(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    }))
  })

  it("writes message, audit, and publishes org envelope on success", async () => {
    const res = await sendMessengerMessageAction({
      roomId: "room-1",
      body: "hello",
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.message.body).toBe("hello")
    expect(writeIamAuditEventFromNextHeadersMock).toHaveBeenCalled()
    expect(publishMessengerOrgEventMock).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        kind: "message.created",
        roomId: "room-1",
      })
    )
  })

  it("returns error when not a room member", async () => {
    assertMessengerRoomMembershipMock.mockResolvedValue(false)
    const res = await sendMessengerMessageAction({
      roomId: "room-1",
      body: "hello",
    })
    expect(res).toEqual({ ok: false, error: "Room not found" })
    expect(insertMock).not.toHaveBeenCalled()
  })
})

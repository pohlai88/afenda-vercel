import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { insertValuesMock, writeIamAuditEventMock } = vi.hoisted(() => ({
  insertValuesMock: vi.fn(),
  writeIamAuditEventMock: vi.fn(),
}))

vi.mock("#lib/auth", () => ({
  writeIamAuditEvent: writeIamAuditEventMock,
}))

vi.mock("#lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: insertValuesMock,
    })),
  },
}))

import { publishOrgNotification } from "#features/org-notifications/data/org-notifications.mutations.server"

describe("publishOrgNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertValuesMock.mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "notice-1",
          publishedAt: new Date("2026-05-11T10:00:00.000Z"),
        },
      ]),
    })
  })

  it("writes a system notice and audit event", async () => {
    const result = await publishOrgNotification({
      organizationId: "org-1",
      title: "ERP maintenance",
      body: "Search indexing is paused.",
      severity: "warning",
      targetUserId: "user-1",
      linkedEntityType: "Workflow",
      linkedEntityId: "run-1",
    })

    expect(result.noticeId).toBe("notice-1")
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        source: "system",
        title: "ERP maintenance",
        severity: "warning",
        targetUserId: "user-1",
        linkedEntityType: "Workflow",
        linkedEntityId: "run-1",
      })
    )
    expect(writeIamAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "org.notification.create",
        organizationId: "org-1",
        resourceType: "org_notification_notice",
        metadata: expect.objectContaining({
          source: "system",
          severity: "warning",
          targetUserId: "user-1",
          linkedEntityType: "Workflow",
          linkedEntityId: "run-1",
        }),
      })
    )
  })
})

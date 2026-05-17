import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  acknowledgeOrgNotificationMock,
  canActInOrganizationMock,
  canUseErpPermissionMock,
  closeOrgNotificationMock,
  createOrgNotificationMock,
  getOrgSessionFromRequestMock,
  listActiveOrgNotificationsForUserMock,
  markOrgNotificationReadMock,
  writeIamAuditEventFromHeadersMock,
} = vi.hoisted(() => ({
  acknowledgeOrgNotificationMock: vi.fn(),
  canActInOrganizationMock: vi.fn(),
  canUseErpPermissionMock: vi.fn(),
  closeOrgNotificationMock: vi.fn(),
  createOrgNotificationMock: vi.fn(),
  getOrgSessionFromRequestMock: vi.fn(),
  listActiveOrgNotificationsForUserMock: vi.fn(),
  markOrgNotificationReadMock: vi.fn(),
  writeIamAuditEventFromHeadersMock: vi.fn(),
}))

vi.mock("#lib/auth", () => ({
  getOrgSessionFromRequest: getOrgSessionFromRequestMock,
  canActInOrganization: canActInOrganizationMock,
  writeIamAuditEventFromHeaders: writeIamAuditEventFromHeadersMock,
}))

vi.mock("#features/org-notifications/server", () => ({
  acknowledgeOrgNotification: acknowledgeOrgNotificationMock,
  closeOrgNotification: closeOrgNotificationMock,
  createOrgNotification: createOrgNotificationMock,
  listActiveOrgNotificationsForUser: listActiveOrgNotificationsForUserMock,
  markOrgNotificationRead: markOrgNotificationReadMock,
}))

vi.mock("#features/erp-rbac/server", () => ({
  canUseErpPermission: canUseErpPermissionMock,
}))

import {
  GET,
  POST as POST_COLLECTION,
} from "../../app/api/erp/notifications/route"
import { POST as POST_ACKNOWLEDGE } from "../../app/api/erp/notifications/[noticeId]/acknowledge/route"
import { POST as POST_CLOSE } from "../../app/api/erp/notifications/[noticeId]/close/route"
import { POST as POST_READ } from "../../app/api/erp/notifications/[noticeId]/read/route"

describe("api/erp/notifications routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists active notices for the current org member", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: { email: "ops@example.com", name: "Ops", role: "member" },
    })
    listActiveOrgNotificationsForUserMock.mockResolvedValue([
      { id: "notice-1" },
    ])

    const response = await GET(
      new Request("https://app.test/api/erp/notifications")
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [{ id: "notice-1" }] })
    expect(listActiveOrgNotificationsForUserMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
    })
  })

  it("blocks collection create for non-admin org members", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: { email: "ops@example.com", name: "Ops", role: "member" },
    })
    canUseErpPermissionMock.mockResolvedValue(false)

    const response = await POST_COLLECTION(
      new Request("https://app.test/api/erp/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Planned maintenance",
          body: "We will rotate credentials tonight.",
          severity: "warning",
        }),
      })
    )

    expect(response.status).toBe(403)
    expect(createOrgNotificationMock).not.toHaveBeenCalled()
  })

  it("creates admin-authored notices and audits them", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: { email: "ops@example.com", name: "Ops", role: "admin" },
    })
    canUseErpPermissionMock.mockResolvedValue(true)
    createOrgNotificationMock.mockResolvedValue({
      noticeId: "notice-1",
      publishedAt: new Date("2026-05-11T10:00:00.000Z"),
    })

    const response = await POST_COLLECTION(
      new Request("https://app.test/api/erp/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Vendor window",
          body: "Expect a brief hold on outbound payments.",
          severity: "critical",
          linkedEntityType: "Vendor",
          linkedEntityId: "vendor-1",
          linkedEntityLabel: "Vendor ACME",
          linkedPath: "/en/o/acme/dashboard/vendors/vendor-1",
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(createOrgNotificationMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      data: expect.objectContaining({
        title: "Vendor window",
        severity: "critical",
        linkedEntityType: "Vendor",
        linkedEntityId: "vendor-1",
      }),
    })
    expect(writeIamAuditEventFromHeadersMock).toHaveBeenCalledWith(
      expect.any(Headers),
      expect.objectContaining({
        action: "org.notification.create",
        resourceId: "notice-1",
        metadata: expect.objectContaining({
          source: "admin",
          severity: "critical",
          linkedEntityType: "Vendor",
          linkedEntityId: "vendor-1",
        }),
      })
    )
  })

  it("marks a notice read and acknowledged through the member routes", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: { email: "ops@example.com", name: "Ops", role: "member" },
    })

    const readResponse = await POST_READ(
      new Request("https://app.test/api/erp/notifications/notice-1/read", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ noticeId: "notice-1" }),
      } as RouteContext<"/api/erp/notifications/[noticeId]/read">
    )

    const acknowledgeResponse = await POST_ACKNOWLEDGE(
      new Request(
        "https://app.test/api/erp/notifications/notice-1/acknowledge",
        {
          method: "POST",
        }
      ),
      {
        params: Promise.resolve({ noticeId: "notice-1" }),
      } as RouteContext<"/api/erp/notifications/[noticeId]/acknowledge">
    )

    expect(readResponse.status).toBe(200)
    expect(acknowledgeResponse.status).toBe(200)
    expect(markOrgNotificationReadMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      noticeId: "notice-1",
    })
    expect(acknowledgeOrgNotificationMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      noticeId: "notice-1",
    })
  })

  it("blocks close for members and allows it for admins", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: { email: "ops@example.com", name: "Ops", role: "member" },
    })
    canUseErpPermissionMock.mockResolvedValue(false)

    const forbidden = await POST_CLOSE(
      new Request("https://app.test/api/erp/notifications/notice-1/close", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ noticeId: "notice-1" }),
      } as RouteContext<"/api/erp/notifications/[noticeId]/close">
    )

    expect(forbidden.status).toBe(403)

    canUseErpPermissionMock.mockResolvedValue(true)
    const allowed = await POST_CLOSE(
      new Request("https://app.test/api/erp/notifications/notice-1/close", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ noticeId: "notice-1" }),
      } as RouteContext<"/api/erp/notifications/[noticeId]/close">
    )

    expect(allowed.status).toBe(200)
    expect(closeOrgNotificationMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      noticeId: "notice-1",
    })
  })
})

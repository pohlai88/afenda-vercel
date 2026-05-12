import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  captureExceptionMock,
  getOrgSessionFromRequestMock,
  getSignedInSessionFromRequestMock,
  handleUploadMock,
  logUnexpectedServerErrorMock,
  rootLoggerInfoMock,
  writeIamAuditEventFromHeadersMock,
} = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  getOrgSessionFromRequestMock: vi.fn(),
  getSignedInSessionFromRequestMock: vi.fn(),
  handleUploadMock: vi.fn(),
  logUnexpectedServerErrorMock: vi.fn(),
  rootLoggerInfoMock: vi.fn(),
  writeIamAuditEventFromHeadersMock: vi.fn(),
}))

vi.mock("@vercel/blob/client", () => ({
  handleUpload: handleUploadMock,
}))

vi.mock("#lib/tenant", () => ({
  getOrgSessionFromRequest: getOrgSessionFromRequestMock,
  getSignedInSessionFromRequest: getSignedInSessionFromRequestMock,
}))

vi.mock("#lib/auth", () => ({
  writeIamAuditEventFromHeaders: writeIamAuditEventFromHeadersMock,
}))

vi.mock("#lib/logger.server", () => ({
  rootLogger: {
    info: rootLoggerInfoMock,
  },
  logUnexpectedServerError: logUnexpectedServerErrorMock,
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
}))

import { POST } from "../../app/api/upload/blob/route"

describe("api/upload/blob route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects generate-token requests without an org session", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue(null)
    getSignedInSessionFromRequestMock.mockResolvedValue(null)

    const response = await POST(
      new Request("https://app.test/api/upload/blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: {
            pathname: "orgs/org-1/nexus-utility/report.pdf",
            clientPayload: null,
            multipart: false,
          },
        }),
      })
    )

    expect(response.status).toBe(401)
    expect(handleUploadMock).not.toHaveBeenCalled()
  })

  it("mints upload tokens for the current org prefix only", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: {
        email: "ops@example.com",
        name: "Ops",
        role: "admin",
      },
    })
    getSignedInSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      user: {
        email: "ops@example.com",
        name: "Ops",
        role: "admin",
      },
    })

    handleUploadMock.mockImplementation(async ({ onBeforeGenerateToken }) => {
      const tokenConfig = await onBeforeGenerateToken(
        "orgs/org-1/nexus-utility/report.pdf",
        JSON.stringify({
          fileName: "report.pdf",
          fileSize: 1234,
          mimeType: "application/pdf",
          routePath: "/en/o/acme/dashboard/home",
        }),
        false
      )

      expect(tokenConfig.allowedContentTypes).toEqual([
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ])
      expect(tokenConfig.maximumSizeInBytes).toBe(50 * 1024 * 1024)
      expect(JSON.parse(tokenConfig.tokenPayload ?? "{}")).toMatchObject({
        userId: "user-1",
        sessionId: "session-1",
        organizationId: "org-1",
        pathname: "orgs/org-1/nexus-utility/report.pdf",
        clientPayload: {
          fileName: "report.pdf",
          fileSize: 1234,
          mimeType: "application/pdf",
          routePath: "/en/o/acme/dashboard/home",
        },
      })

      return {
        type: "blob.generate-client-token",
        clientToken: "vercel_blob_client_example",
      }
    })

    const response = await POST(
      new Request("https://app.test/api/upload/blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: {
            pathname: "orgs/org-1/nexus-utility/report.pdf",
            clientPayload: null,
            multipart: false,
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      type: "blob.generate-client-token",
      clientToken: "vercel_blob_client_example",
    })
  })

  it("rejects token requests for a different org prefix", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: {
        email: "ops@example.com",
        name: "Ops",
        role: "admin",
      },
    })
    getSignedInSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      user: {
        email: "ops@example.com",
        name: "Ops",
        role: "admin",
      },
    })

    handleUploadMock.mockImplementation(async ({ onBeforeGenerateToken }) => {
      await onBeforeGenerateToken(
        "orgs/org-2/nexus-utility/report.pdf",
        null,
        false
      )
      return {
        type: "blob.generate-client-token",
        clientToken: "unreachable",
      }
    })

    const response = await POST(
      new Request("https://app.test/api/upload/blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: {
            pathname: "orgs/org-2/nexus-utility/report.pdf",
            clientPayload: null,
            multipart: false,
          },
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "Upload path is not allowed for this workspace",
    })
  })

  it("mints screenshot upload tokens for the current org prefix", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: {
        email: "ops@example.com",
        name: "Ops",
        role: "admin",
      },
    })
    getSignedInSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      user: {
        email: "ops@example.com",
        name: "Ops",
        role: "admin",
      },
    })

    handleUploadMock.mockImplementation(async ({ onBeforeGenerateToken }) => {
      const tokenConfig = await onBeforeGenerateToken(
        "orgs/org-1/nexus-screenshot/workspace-123.png",
        JSON.stringify({
          source: "nexus-utility-screenshot",
          captureMode: "workspace",
          fileName: "workspace-123.png",
          fileSize: 222,
          mimeType: "image/png",
          routePath: "/en/o/acme/dashboard/home",
        }),
        false
      )

      expect(JSON.parse(tokenConfig.tokenPayload ?? "{}")).toMatchObject({
        organizationId: "org-1",
        pathname: "orgs/org-1/nexus-screenshot/workspace-123.png",
        clientPayload: {
          source: "nexus-utility-screenshot",
          captureMode: "workspace",
          fileName: "workspace-123.png",
          fileSize: 222,
          mimeType: "image/png",
          routePath: "/en/o/acme/dashboard/home",
        },
      })

      return {
        type: "blob.generate-client-token",
        clientToken: "vercel_blob_client_example",
      }
    })

    const response = await POST(
      new Request("https://app.test/api/upload/blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: {
            pathname: "orgs/org-1/nexus-screenshot/workspace-123.png",
            clientPayload: null,
            multipart: false,
          },
        }),
      })
    )

    expect(response.status).toBe(200)
  })

  it("mints coordination evidence upload tokens for the current org prefix", async () => {
    getOrgSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      user: {
        email: "ops@example.com",
        name: "Ops",
        role: "admin",
      },
    })
    getSignedInSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      user: {
        email: "ops@example.com",
        name: "Ops",
        role: "admin",
      },
    })

    handleUploadMock.mockImplementation(async ({ onBeforeGenerateToken }) => {
      const tokenConfig = await onBeforeGenerateToken(
        "orgs/org-1/nexus-coordination/ctx-1/123-file-report.pdf",
        JSON.stringify({
          source: "nexus-utility-messenger",
          contextId: "ctx-1",
          activityDraftId: "draft-1",
          evidenceKind: "file",
          linkedEntityType: "vendor",
          linkedEntityId: "vendor-1",
          fileName: "report.pdf",
          fileSize: 333,
          mimeType: "application/pdf",
          routePath: "/en/o/acme/dashboard/home",
        }),
        false
      )

      expect(JSON.parse(tokenConfig.tokenPayload ?? "{}")).toMatchObject({
        organizationId: "org-1",
        pathname: "orgs/org-1/nexus-coordination/ctx-1/123-file-report.pdf",
        clientPayload: {
          source: "nexus-utility-messenger",
          contextId: "ctx-1",
          activityDraftId: "draft-1",
          evidenceKind: "file",
          linkedEntityType: "vendor",
          linkedEntityId: "vendor-1",
          fileName: "report.pdf",
          fileSize: 333,
          mimeType: "application/pdf",
          routePath: "/en/o/acme/dashboard/home",
        },
      })

      return {
        type: "blob.generate-client-token",
        clientToken: "vercel_blob_client_example",
      }
    })

    const response = await POST(
      new Request("https://app.test/api/upload/blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: {
            pathname: "orgs/org-1/nexus-coordination/ctx-1/123-file-report.pdf",
            clientPayload: null,
            multipart: false,
          },
        }),
      })
    )

    expect(response.status).toBe(200)
  })

  it("accepts upload completion callbacks without a user session and writes audit", async () => {
    handleUploadMock.mockImplementation(async ({ onUploadCompleted }) => {
      await onUploadCompleted?.({
        blob: {
          url: "https://blob.example/report.pdf",
          downloadUrl: "https://blob.example/report.pdf?download=1",
          pathname: "orgs/org-1/nexus-utility/123-report.pdf",
          contentType: "application/pdf",
          contentDisposition: "inline",
        },
        tokenPayload: JSON.stringify({
          userId: "user-1",
          sessionId: "session-1",
          organizationId: "org-1",
          pathname: "orgs/org-1/nexus-utility/123-report.pdf",
          clientPayload: {
            source: "nexus-utility-right-rail",
            fileName: "report.pdf",
            fileSize: 321,
            mimeType: "application/pdf",
            routePath: "/en/o/acme/dashboard/home",
          },
        }),
      })

      return {
        type: "blob.upload-completed",
        response: "ok",
      }
    })

    const request = new Request("https://app.test/api/upload/blob", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-signature": "test-signature",
      },
      body: JSON.stringify({
        type: "blob.upload-completed",
        payload: {
          blob: {
            url: "https://blob.example/report.pdf",
          },
        },
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(getOrgSessionFromRequestMock).not.toHaveBeenCalled()
    expect(writeIamAuditEventFromHeadersMock).toHaveBeenCalledWith(
      request.headers,
      expect.objectContaining({
        action: "erp.upload.blob.create",
        actorUserId: "user-1",
        actorSessionId: "session-1",
        organizationId: "org-1",
        resourceType: "blob",
        resourceId: "orgs/org-1/nexus-utility/123-report.pdf",
        path: "/en/o/acme/dashboard/home",
      })
    )
  })

  it("writes capture mode metadata for screenshot completion callbacks", async () => {
    handleUploadMock.mockImplementation(async ({ onUploadCompleted }) => {
      await onUploadCompleted?.({
        blob: {
          url: "https://blob.example/workspace.png",
          downloadUrl: "https://blob.example/workspace.png?download=1",
          pathname: "orgs/org-1/nexus-screenshot/workspace-123.png",
          contentType: "image/png",
          contentDisposition: "inline",
        },
        tokenPayload: JSON.stringify({
          userId: "user-1",
          sessionId: "session-1",
          organizationId: "org-1",
          pathname: "orgs/org-1/nexus-screenshot/workspace-123.png",
          clientPayload: {
            source: "nexus-utility-screenshot",
            captureMode: "workspace",
            fileName: "workspace-123.png",
            fileSize: 654,
            mimeType: "image/png",
            routePath: "/en/o/acme/dashboard/home",
          },
        }),
      })

      return {
        type: "blob.upload-completed",
        response: "ok",
      }
    })

    const request = new Request("https://app.test/api/upload/blob", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-signature": "test-signature",
      },
      body: JSON.stringify({
        type: "blob.upload-completed",
        payload: {
          blob: {
            url: "https://blob.example/workspace.png",
          },
        },
      }),
    })

    await POST(request)

    expect(writeIamAuditEventFromHeadersMock).toHaveBeenCalledWith(
      request.headers,
      expect.objectContaining({
        metadata: expect.objectContaining({
          captureMode: "workspace",
          source: "nexus-utility-screenshot",
          pathname: "orgs/org-1/nexus-screenshot/workspace-123.png",
        }),
      })
    )
  })

  it("writes coordination metadata for messenger evidence completion callbacks", async () => {
    handleUploadMock.mockImplementation(async ({ onUploadCompleted }) => {
      await onUploadCompleted?.({
        blob: {
          url: "https://blob.example/report.pdf",
          downloadUrl: "https://blob.example/report.pdf?download=1",
          pathname: "orgs/org-1/nexus-coordination/ctx-1/123-file-report.pdf",
          contentType: "application/pdf",
          contentDisposition: "inline",
        },
        tokenPayload: JSON.stringify({
          userId: "user-1",
          sessionId: "session-1",
          organizationId: "org-1",
          pathname: "orgs/org-1/nexus-coordination/ctx-1/123-file-report.pdf",
          clientPayload: {
            source: "nexus-utility-messenger",
            contextId: "ctx-1",
            activityDraftId: "draft-1",
            evidenceKind: "file",
            linkedEntityType: "vendor",
            linkedEntityId: "vendor-1",
            fileName: "report.pdf",
            fileSize: 321,
            mimeType: "application/pdf",
            routePath: "/en/o/acme/dashboard/home",
          },
        }),
      })

      return {
        type: "blob.upload-completed",
        response: "ok",
      }
    })

    const request = new Request("https://app.test/api/upload/blob", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-signature": "test-signature",
      },
      body: JSON.stringify({
        type: "blob.upload-completed",
        payload: {
          blob: {
            url: "https://blob.example/report.pdf",
          },
        },
      }),
    })

    await POST(request)

    expect(writeIamAuditEventFromHeadersMock).toHaveBeenCalledWith(
      request.headers,
      expect.objectContaining({
        metadata: expect.objectContaining({
          contextId: "ctx-1",
          evidenceKind: "file",
          linkedEntityType: "vendor",
          linkedEntityId: "vendor-1",
          source: "nexus-utility-messenger",
        }),
      })
    )
  })
})

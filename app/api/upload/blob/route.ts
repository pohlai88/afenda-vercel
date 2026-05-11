import * as Sentry from "@sentry/nextjs"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { logUnexpectedServerError, rootLogger } from "#lib/logger.server"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
  routePublicErrorMessage,
} from "#lib/route-handler-json.shared"
import {
  getOrgSessionFromRequest,
  getSignedInSessionFromRequest,
} from "#lib/tenant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NEXUS_UTILITY_UPLOAD_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const
const NEXUS_UTILITY_UPLOAD_MAX_SIZE_BYTES = 50 * 1024 * 1024
const NEXUS_ALLOWED_UPLOAD_PREFIXES = [
  "nexus-utility",
  "nexus-screenshot",
  "nexus-coordination",
] as const

type NexusUtilityUploadClientPayload = {
  source?: string | null
  captureMode?: "workspace" | "content" | null
  contextId?: string | null
  activityDraftId?: string | null
  evidenceKind?: "file" | "screenshot" | null
  fileName?: string | null
  fileSize?: number | null
  mimeType?: string | null
  routePath?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
  /** When `source` is `hrm-workforce-document`, echoed for observability only. */
  hrmEmployeeId?: string | null
}

type NexusUtilityUploadTokenPayload = {
  userId?: string
  sessionId?: string
  organizationId?: string
  pathname?: string
  clientPayload?: NexusUtilityUploadClientPayload | null
}

function parseClientPayload(
  raw: string | null
): NexusUtilityUploadClientPayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as NexusUtilityUploadClientPayload
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function parseTokenPayload(raw: string | null | undefined) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as NexusUtilityUploadTokenPayload
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function isAllowedNexusUploadPath(orgId: string, pathname: string): boolean {
  return NEXUS_ALLOWED_UPLOAD_PREFIXES.some((prefix) =>
    pathname.startsWith(`orgs/${orgId}/${prefix}/`)
  )
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Tenant-scoped HR evidence: `orgs/{orgId}/hrm/{employeeId}/…`. */
function isAllowedHrmUploadPath(orgId: string, pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length < 5) return false
  if (parts[0] !== "orgs" || parts[1] !== orgId || parts[2] !== "hrm") {
    return false
  }
  return UUID_RE.test(parts[3] ?? "")
}

function isAllowedOrbitUploadPath(orgId: string, pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length < 5) return false
  if (parts[0] !== "orgs" || parts[1] !== orgId || parts[2] !== "orbit") {
    return false
  }
  return UUID_RE.test(parts[3] ?? "")
}

function isAllowedPersonalOrbitUploadPath(
  userId: string,
  pathname: string
): boolean {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length < 5) return false
  if (parts[0] !== "users" || parts[1] !== userId || parts[2] !== "orbit") {
    return false
  }
  return UUID_RE.test(parts[3] ?? "")
}

function isAllowedOrgWorkspaceUploadPath(
  orgId: string,
  pathname: string
): boolean {
  return (
    isAllowedNexusUploadPath(orgId, pathname) ||
    isAllowedHrmUploadPath(orgId, pathname) ||
    isAllowedOrbitUploadPath(orgId, pathname)
  )
}

export async function POST(request: Request) {
  const parsed = await readRequestJson(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.value as HandleUploadBody

  const isGenerateTokenEvent = body.type === "blob.generate-client-token"
  const orgSession = isGenerateTokenEvent
    ? await getOrgSessionFromRequest(request)
    : null
  const signedInSession = isGenerateTokenEvent
    ? await getSignedInSessionFromRequest(request)
    : null

  if (isGenerateTokenEvent && !orgSession && !signedInSession) {
    return routeJsonError("Unauthorized", 401)
  }

  const organizationId = orgSession?.organizationId ?? null

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!signedInSession) {
          throw new Error("Unauthorized")
        }

        const allowedForOrg =
          orgSession != null &&
          isAllowedOrgWorkspaceUploadPath(orgSession.organizationId, pathname)
        const allowedForPersonal = isAllowedPersonalOrbitUploadPath(
          signedInSession.userId,
          pathname
        )

        if (!allowedForOrg && !allowedForPersonal) {
          throw new Error("Upload path is not allowed for this workspace")
        }

        const parsedClientPayload = parseClientPayload(clientPayload)

        return {
          allowedContentTypes: [...NEXUS_UTILITY_UPLOAD_ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: NEXUS_UTILITY_UPLOAD_MAX_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: signedInSession.userId,
            sessionId: signedInSession.sessionId,
            organizationId: allowedForOrg
              ? orgSession?.organizationId ?? null
              : null,
            pathname,
            clientPayload: parsedClientPayload,
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parseTokenPayload(tokenPayload)
        try {
          rootLogger.info(
            {
              url: blob.url,
              pathname: blob.pathname,
              userId: payload?.userId ?? null,
              organizationId: payload?.organizationId ?? null,
            },
            "blob upload completed"
          )
          await writeIamAuditEventFromHeaders(request.headers, {
            action: "erp.upload.blob.create",
            actorUserId: payload?.userId ?? null,
            actorSessionId: payload?.sessionId ?? null,
            organizationId: payload?.organizationId ?? null,
            resourceType: "blob",
            resourceId: blob.pathname,
            path: payload?.clientPayload?.routePath ?? null,
            metadata: {
              url: blob.url,
              downloadUrl: blob.downloadUrl,
              pathname: blob.pathname,
              contentType:
                payload?.clientPayload?.mimeType ?? blob.contentType ?? null,
              fileName:
                payload?.clientPayload?.fileName ??
                blob.pathname.split("/").at(-1) ??
                null,
              fileSize: payload?.clientPayload?.fileSize ?? null,
              captureMode: payload?.clientPayload?.captureMode ?? null,
              contextId: payload?.clientPayload?.contextId ?? null,
              activityDraftId: payload?.clientPayload?.activityDraftId ?? null,
              evidenceKind: payload?.clientPayload?.evidenceKind ?? null,
              linkedEntityType:
                payload?.clientPayload?.linkedEntityType ?? null,
              linkedEntityId: payload?.clientPayload?.linkedEntityId ?? null,
              source:
                payload?.clientPayload?.source ?? "nexus-utility-right-rail",
            },
          })
        } catch {
          logUnexpectedServerError(
            "blob_upload_completion_audit_failed",
            new Error("blob upload completion audit failed"),
            {
              scope: "api.upload.blob",
              "erp.module": "upload",
              organizationId: organizationId ?? undefined,
            }
          )
          Sentry.captureException(
            new Error("blob upload completion audit failed"),
            {
              tags: { scope: "api.upload.blob", "erp.module": "upload" },
              extra: { organizationId: organizationId ?? undefined },
            }
          )
        }
      },
    })

    return routeJsonOk(jsonResponse)
  } catch (error) {
    logUnexpectedServerError("blob_upload_handle_failed", error, {
      scope: "api.upload.blob",
      "erp.module": "upload",
      organizationId: organizationId ?? undefined,
    })
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      {
        tags: { scope: "api.upload.blob", "erp.module": "upload" },
        extra: { organizationId: organizationId ?? undefined },
      }
    )
    const message = routePublicErrorMessage(error, "Upload failed")
    return routeJsonError(message, 400)
  }
}

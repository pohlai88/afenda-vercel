import * as Sentry from "@sentry/nextjs"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { logUnexpectedServerError, rootLogger } from "#lib/logger.server"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
  routePublicErrorMessage,
} from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"
import {
  canUploadClaimEvidenceForUser,
  canUploadHrmDocumentForUser,
  canUploadPortalEmployeeDocument,
} from "#features/hrm/server"

const WORKBENCH_UTILITY_UPLOAD_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const
const WORKBENCH_UTILITY_UPLOAD_MAX_SIZE_BYTES = 50 * 1024 * 1024
const NEXUS_ALLOWED_UPLOAD_PREFIXES = [
  "nexus-utility",
  "nexus-screenshot",
  "nexus-coordination",
] as const

type AppShellNexusUtilityUploadClientPayload = {
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
  portalSlug?: string | null
}

type AppShellNexusUtilityUploadTokenPayload = {
  userId?: string
  sessionId?: string
  organizationId?: string
  pathname?: string
  clientPayload?: AppShellNexusUtilityUploadClientPayload | null
}

function parseClientPayload(
  raw: string | null
): AppShellNexusUtilityUploadClientPayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AppShellNexusUtilityUploadClientPayload
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function parseTokenPayload(raw: string | null | undefined) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AppShellNexusUtilityUploadTokenPayload
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

type HrmUploadPath = {
  organizationId: string
  employeeId: string
  claimId: string | null
}

function parseAnyHrmUploadPath(pathname: string): HrmUploadPath | null {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length < 5) return null
  if (parts[0] !== "orgs" || parts[2] !== "hrm") return null
  const organizationId = parts[1] ?? ""
  const employeeId = parts[3] ?? ""
  if (!organizationId || !UUID_RE.test(employeeId)) return null
  if (parts[4] !== "claims") {
    return { organizationId, employeeId, claimId: null }
  }
  const claimId = parts[5] ?? ""
  if (parts.length < 7 || !UUID_RE.test(claimId)) return null
  return { organizationId, employeeId, claimId }
}

/** Tenant-scoped HR evidence: `orgs/{orgId}/hrm/{employeeId}/…`. */
function parseHrmUploadPath(
  orgId: string,
  pathname: string
): HrmUploadPath | null {
  const parsed = parseAnyHrmUploadPath(pathname)
  return parsed?.organizationId === orgId ? parsed : null
}

async function isAllowedHrmUploadPath(input: {
  orgId: string
  userId: string
  pathname: string
  clientPayload: AppShellNexusUtilityUploadClientPayload | null
}): Promise<boolean> {
  const parsed = parseHrmUploadPath(input.orgId, input.pathname)
  if (!parsed) return false
  if (!parsed.claimId) {
    return canUploadHrmDocumentForUser({
      organizationId: input.orgId,
      userId: input.userId,
      employeeId: parsed.employeeId,
    })
  }
  if (
    input.clientPayload?.linkedEntityType &&
    input.clientPayload.linkedEntityType !== "hrm_claim"
  ) {
    return false
  }
  if (
    input.clientPayload?.linkedEntityId &&
    input.clientPayload.linkedEntityId !== parsed.claimId
  ) {
    return false
  }
  return canUploadClaimEvidenceForUser({
    organizationId: input.orgId,
    userId: input.userId,
    employeeId: parsed.employeeId,
    claimId: parsed.claimId,
  })
}

async function isAllowedPortalHrmUploadPath(input: {
  pathname: string
  clientPayload: AppShellNexusUtilityUploadClientPayload | null
}): Promise<{ ok: true; organizationId: string } | { ok: false }> {
  const parsed = parseAnyHrmUploadPath(input.pathname)
  const portalSlug = input.clientPayload?.portalSlug?.trim()
  if (!parsed || parsed.claimId || !portalSlug) return { ok: false }

  const allowed = await canUploadPortalEmployeeDocument({
    portalSlug,
    organizationId: parsed.organizationId,
    employeeId: parsed.employeeId,
  })
  return allowed
    ? { ok: true, organizationId: parsed.organizationId }
    : { ok: false }
}

function isAllowedOrbitUploadPath(orgId: string, pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length < 5) return false
  if (parts[0] !== "orgs" || parts[1] !== orgId || parts[2] !== "orbit") {
    return false
  }
  return UUID_RE.test(parts[3] ?? "")
}

async function isAllowedOrgWorkspaceUploadPath(input: {
  orgId: string
  userId: string
  pathname: string
  clientPayload: AppShellNexusUtilityUploadClientPayload | null
}): Promise<boolean> {
  return (
    isAllowedNexusUploadPath(input.orgId, input.pathname) ||
    (await isAllowedHrmUploadPath(input)) ||
    isAllowedOrbitUploadPath(input.orgId, input.pathname)
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
  const portalUpload =
    isGenerateTokenEvent && !orgSession
      ? await isAllowedPortalHrmUploadPath({
          pathname: body.payload.pathname,
          clientPayload: parseClientPayload(body.payload.clientPayload),
        })
      : null

  const organizationId = orgSession?.organizationId ?? null

  if (isGenerateTokenEvent && !orgSession && !portalUpload?.ok) {
    return routeJsonError("Unauthorized", 401)
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!orgSession) {
          const parsedClientPayload = parseClientPayload(clientPayload)
          const portalOrganizationId =
            portalUpload && portalUpload.ok ? portalUpload.organizationId : null
          return {
            allowedContentTypes: [
              ...WORKBENCH_UTILITY_UPLOAD_ALLOWED_CONTENT_TYPES,
            ],
            maximumSizeInBytes: WORKBENCH_UTILITY_UPLOAD_MAX_SIZE_BYTES,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({
              userId: null,
              sessionId: null,
              organizationId: portalOrganizationId,
              pathname,
              clientPayload: parsedClientPayload,
            }),
          }
        }

        const parsedClientPayload = parseClientPayload(clientPayload)
        const allowedForOrg = await isAllowedOrgWorkspaceUploadPath({
          orgId: orgSession.organizationId,
          userId: orgSession.userId,
          pathname,
          clientPayload: parsedClientPayload,
        })

        if (!allowedForOrg) {
          throw new Error("Upload path is not allowed for this workspace")
        }

        return {
          allowedContentTypes: [
            ...WORKBENCH_UTILITY_UPLOAD_ALLOWED_CONTENT_TYPES,
          ],
          maximumSizeInBytes: WORKBENCH_UTILITY_UPLOAD_MAX_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: orgSession.userId,
            sessionId: orgSession.sessionId,
            organizationId: orgSession.organizationId,
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

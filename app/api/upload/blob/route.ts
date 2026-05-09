import * as Sentry from "@sentry/nextjs"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

import { logUnexpectedServerError, rootLogger } from "#lib/logger.server"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
  routePublicErrorMessage,
} from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) {
    return routeJsonError("Unauthorized", 401)
  }

  const { userId, organizationId } = orgSession

  const parsed = await readRequestJson(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.value as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId,
            organizationId,
            clientPayload: clientPayload ?? null,
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const payload = JSON.parse(tokenPayload ?? "{}") as {
            userId?: string
            organizationId?: string
          }
          rootLogger.info(
            {
              url: blob.url,
              userId: payload.userId ?? null,
              organizationId: payload.organizationId ?? null,
            },
            "blob upload completed"
          )
        } catch {
          logUnexpectedServerError(
            "blob_upload_token_payload_parse_failed",
            new Error("tokenPayload JSON parse failed"),
            {
              scope: "api.upload.blob",
              "erp.module": "upload",
              organizationId,
            }
          )
          Sentry.captureException(new Error("tokenPayload JSON parse failed"), {
            tags: { scope: "api.upload.blob", "erp.module": "upload" },
            extra: { organizationId },
          })
        }
      },
    })

    return routeJsonOk(jsonResponse)
  } catch (error) {
    logUnexpectedServerError("blob_upload_handle_failed", error, {
      scope: "api.upload.blob",
      "erp.module": "upload",
      organizationId,
    })
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      {
        tags: { scope: "api.upload.blob", "erp.module": "upload" },
        extra: { organizationId },
      }
    )
    const message = routePublicErrorMessage(error, "Upload failed")
    return routeJsonError(message, 400)
  }
}

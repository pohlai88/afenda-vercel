import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
  routePublicErrorMessage,
} from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const dynamic = "force-dynamic"

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
          console.info("blob upload completed", {
            url: blob.url,
            userId: payload.userId,
            organizationId: payload.organizationId,
          })
        } catch {
          console.error("blob upload completed but tokenPayload parse failed")
        }
      },
    })

    return routeJsonOk(jsonResponse)
  } catch (error) {
    const message = routePublicErrorMessage(error, "Upload failed")
    return routeJsonError(message, 400)
  }
}

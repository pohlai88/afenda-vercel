import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

import { getOrgSessionFromRequest } from "#lib/tenant"

export async function POST(request: Request): Promise<NextResponse> {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId, organizationId } = orgSession

  const body = (await request.json()) as HandleUploadBody

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

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    )
  }
}

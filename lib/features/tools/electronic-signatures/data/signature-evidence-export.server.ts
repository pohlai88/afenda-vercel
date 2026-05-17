import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDocument, hrmSignatureRequest } from "#lib/db/schema"

import { listSignatureEventsForRequest } from "./signature-request.queries.server"
import type { SignedEnvelopeV1 } from "../schemas/signature.schema"

export type SignatureEvidenceExport = {
  readonly envelope: SignedEnvelopeV1 | null
  readonly timeline: Awaited<ReturnType<typeof listSignatureEventsForRequest>>
}

export async function buildSignatureEvidenceExport(input: {
  readonly organizationId: string
  readonly requestId: string
}): Promise<SignatureEvidenceExport> {
  const [request] = await db
    .select({
      signedEnvelopeDocumentId: hrmSignatureRequest.signedEnvelopeDocumentId,
    })
    .from(hrmSignatureRequest)
    .where(
      and(
        eq(hrmSignatureRequest.organizationId, input.organizationId),
        eq(hrmSignatureRequest.id, input.requestId)
      )
    )
    .limit(1)

  const timeline = await listSignatureEventsForRequest(
    input.organizationId,
    input.requestId
  )

  if (!request?.signedEnvelopeDocumentId) {
    return { envelope: null, timeline }
  }

  const [doc] = await db
    .select({ blobUrl: hrmDocument.blobUrl })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, input.organizationId),
        eq(hrmDocument.id, request.signedEnvelopeDocumentId)
      )
    )
    .limit(1)

  if (!doc?.blobUrl) {
    return { envelope: null, timeline }
  }

  const response = await fetch(doc.blobUrl, { cache: "no-store" })
  if (!response.ok) {
    return { envelope: null, timeline }
  }

  const envelope = (await response.json()) as SignedEnvelopeV1
  return { envelope, timeline }
}

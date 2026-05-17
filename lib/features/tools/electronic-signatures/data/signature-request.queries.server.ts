import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmDocument,
  hrmSignatureEvent,
  hrmSignatureParty,
  hrmSignatureRequest,
} from "#lib/db/schema"

export type SignatureRequestListRow = {
  readonly id: string
  readonly publicSlug: string
  readonly kind: string
  readonly subjectId: string
  readonly derivedStatus: string
  readonly signingOrder: string
  readonly sentAt: Date | null
  readonly createdAt: Date
}

export async function listSignatureRequestsForOrganization(
  organizationId: string
): Promise<SignatureRequestListRow[]> {
  return db
    .select({
      id: hrmSignatureRequest.id,
      publicSlug: hrmSignatureRequest.publicSlug,
      kind: hrmSignatureRequest.kind,
      subjectId: hrmSignatureRequest.subjectId,
      derivedStatus: hrmSignatureRequest.derivedStatus,
      signingOrder: hrmSignatureRequest.signingOrder,
      sentAt: hrmSignatureRequest.sentAt,
      createdAt: hrmSignatureRequest.createdAt,
    })
    .from(hrmSignatureRequest)
    .where(eq(hrmSignatureRequest.organizationId, organizationId))
    .orderBy(desc(hrmSignatureRequest.createdAt))
}

export async function getSignatureRequestByPublicSlug(
  organizationId: string,
  publicSlug: string
) {
  const [row] = await db
    .select()
    .from(hrmSignatureRequest)
    .where(
      and(
        eq(hrmSignatureRequest.organizationId, organizationId),
        eq(hrmSignatureRequest.publicSlug, publicSlug)
      )
    )
    .limit(1)
  return row ?? null
}

export async function getSignatureRequestById(
  organizationId: string,
  requestId: string
) {
  const [row] = await db
    .select()
    .from(hrmSignatureRequest)
    .where(
      and(
        eq(hrmSignatureRequest.organizationId, organizationId),
        eq(hrmSignatureRequest.id, requestId)
      )
    )
    .limit(1)
  return row ?? null
}

export async function listSignaturePartiesForRequest(
  organizationId: string,
  requestId: string
) {
  return db
    .select()
    .from(hrmSignatureParty)
    .where(
      and(
        eq(hrmSignatureParty.organizationId, organizationId),
        eq(hrmSignatureParty.requestId, requestId)
      )
    )
    .orderBy(hrmSignatureParty.signerOrder)
}

export async function listSignatureEventsForRequest(
  organizationId: string,
  requestId: string
) {
  return db
    .select()
    .from(hrmSignatureEvent)
    .where(
      and(
        eq(hrmSignatureEvent.organizationId, organizationId),
        eq(hrmSignatureEvent.requestId, requestId)
      )
    )
    .orderBy(hrmSignatureEvent.occurredAt)
}

export async function getSignaturePartyByToken(partyToken: string) {
  const [row] = await db
    .select({
      party: hrmSignatureParty,
      request: hrmSignatureRequest,
    })
    .from(hrmSignatureParty)
    .innerJoin(
      hrmSignatureRequest,
      eq(hrmSignatureRequest.id, hrmSignatureParty.requestId)
    )
    .where(eq(hrmSignatureParty.token, partyToken))
    .limit(1)
  return row ?? null
}

export async function getSignatureDeclarationText(
  organizationId: string,
  requestId: string
): Promise<string | null> {
  const [event] = await db
    .select({ data: hrmSignatureEvent.data })
    .from(hrmSignatureEvent)
    .where(
      and(
        eq(hrmSignatureEvent.organizationId, organizationId),
        eq(hrmSignatureEvent.requestId, requestId),
        eq(hrmSignatureEvent.type, "signature_request.created")
      )
    )
    .orderBy(hrmSignatureEvent.occurredAt)
    .limit(1)

  if (!event) {
    return null
  }

  const data = event.data as Record<string, unknown>
  return typeof data.declarationText === "string" ? data.declarationText : null
}

export async function getSignatureSourceDocumentPreview(input: {
  readonly organizationId: string
  readonly documentId: string
}): Promise<{
  readonly blobUrl: string
  readonly mimeType: string | null
  readonly title: string
} | null> {
  const [row] = await db
    .select({
      blobUrl: hrmDocument.blobUrl,
      mimeType: hrmDocument.mimeType,
      title: hrmDocument.title,
    })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, input.organizationId),
        eq(hrmDocument.id, input.documentId)
      )
    )
    .limit(1)

  return row ?? null
}

export async function listPendingSignaturePartiesForEmployee(
  organizationId: string,
  employeeId: string
) {
  return db
    .select({
      party: hrmSignatureParty,
      request: hrmSignatureRequest,
    })
    .from(hrmSignatureParty)
    .innerJoin(
      hrmSignatureRequest,
      eq(hrmSignatureRequest.id, hrmSignatureParty.requestId)
    )
    .where(
      and(
        eq(hrmSignatureParty.organizationId, organizationId),
        eq(hrmSignatureParty.signerEmployeeId, employeeId),
        eq(hrmSignatureParty.signingStatus, "not_signed"),
        eq(hrmSignatureParty.sendStatus, "sent")
      )
    )
    .orderBy(desc(hrmSignatureRequest.sentAt))
}

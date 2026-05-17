import { FatalError } from "workflow"
import { put } from "@vercel/blob"
import { and, asc, eq } from "drizzle-orm"

import type { SignatureSealPayload } from "#features/execution"
import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmBoardingTask,
  hrmDocument,
  hrmEmploymentContract,
  hrmSignatureEvent,
  hrmSignatureParty,
  hrmSignatureRequest,
} from "#lib/db/schema"

import { stableJsonStringify } from "#lib/erp/stable-json.shared"
import type { SignedEnvelopeV1 } from "../schemas/signature.schema"
import {
  hashStableSignatureEnvelope,
  payloadHashSuffix,
} from "./signature-envelope.shared"
import { auditActionForSignatureEvent } from "./signature-event-types.shared"
import { insertSignatureEvent } from "./signature-request.mutations.server"
import { triggerSignatureWebhook } from "./signature-webhook.server"

function signatureEnvelopeBlobPath(
  organizationId: string,
  requestId: string,
  schemaVersion: number
): string {
  return `hrm/signatures/${organizationId}/${requestId}/v${schemaVersion}/envelope.json`
}

export async function hrmSignatureSealWorkflow(payload: SignatureSealPayload) {
  "use workflow"

  try {
    await sealSignatureRequestStep(payload)
  } catch (err) {
    await sealFailedStep(payload, err)
    throw err
  }
}

async function sealSignatureRequestStep(payload: SignatureSealPayload) {
  "use step"

  const [request] = await db
    .select()
    .from(hrmSignatureRequest)
    .where(
      and(
        eq(hrmSignatureRequest.organizationId, payload.organizationId),
        eq(hrmSignatureRequest.id, payload.requestId),
        eq(hrmSignatureRequest.schemaVersion, payload.schemaVersion)
      )
    )
    .limit(1)

  if (!request) {
    throw new FatalError("signature_request_not_found")
  }

  if (request.signedEnvelopeDocumentId) {
    return
  }

  const [sourceDoc] = await db
    .select()
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, payload.organizationId),
        eq(hrmDocument.id, request.documentId)
      )
    )
    .limit(1)

  if (!sourceDoc) {
    throw new FatalError("source_document_missing")
  }

  const parties = await db
    .select()
    .from(hrmSignatureParty)
    .where(eq(hrmSignatureParty.requestId, request.id))
    .orderBy(asc(hrmSignatureParty.signerOrder))

  const proofEvents = await db
    .select()
    .from(hrmSignatureEvent)
    .where(
      and(
        eq(hrmSignatureEvent.requestId, request.id),
        eq(hrmSignatureEvent.type, "signature_request.recipient_completed")
      )
    )

  const ceremonyCompletedAt = new Date().toISOString()
  const envelopeParties = parties
    .filter((p) => p.signingStatus === "signed")
    .map((party) => {
      const proof = proofEvents.find((e) => e.partyId === party.id)
      const data = (proof?.data ?? {}) as Record<string, unknown>
      return {
        partyId: party.id,
        order: party.signerOrder,
        employeeId: party.signerEmployeeId,
        email: party.signerEmail,
        displayName: party.signerName,
        signedAt: party.signedAt?.toISOString() ?? ceremonyCompletedAt,
        intent: {
          ip: proof?.ipAddress ?? null,
          userAgent: proof?.userAgent ?? null,
          locale: "en",
        },
        typedName: (data.typedName as string | null) ?? null,
        drawnSignatureSha256:
          (data.drawnSignatureSha256 as string | null) ?? null,
      }
    })

  const subjectSummary = {
    label:
      request.kind === "contract"
        ? `Contract ${request.subjectId}`
        : `Boarding task ${request.subjectId}`,
    employeeId: sourceDoc.employeeId,
    contractId: request.kind === "contract" ? request.subjectId : null,
    taskId: request.kind === "boarding_task" ? request.subjectId : null,
  }

  const envelope: SignedEnvelopeV1 = {
    version: "1",
    signatureRequestId: request.id,
    organizationId: payload.organizationId,
    subject: {
      type: request.kind as "contract" | "boarding_task",
      id: request.subjectId,
      summary: subjectSummary,
    },
    sourceDocument: {
      id: sourceDoc.id,
      sha256: sourceDoc.payloadHash,
    },
    declaration: {
      textSha256: request.declarationTextHash,
      locale: "en",
    },
    parties: envelopeParties,
    ceremonyCompletedAt,
  }

  const payloadHash = hashStableSignatureEnvelope(envelope)
  const jsonBody = stableJsonStringify(envelope)

  const blob = await put(
    signatureEnvelopeBlobPath(
      payload.organizationId,
      request.id,
      payload.schemaVersion
    ),
    jsonBody,
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    }
  )

  const actorUserId = payload.actorUserId ?? request.createdByUserId ?? "system"
  let envelopeDocumentId: string | null = null

  await db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(hrmDocument)
      .values({
        organizationId: payload.organizationId,
        employeeId: sourceDoc.employeeId,
        documentType: "signature_proof",
        subjectKind: "signature_request",
        subjectId: request.id,
        title: `Signed envelope — ${subjectSummary.label}`,
        blobUrl: blob.url,
        payloadHash,
        mimeType: "application/json",
        sizeBytes: new TextEncoder().encode(jsonBody).byteLength,
        classification: "restricted",
        retentionPolicyCode: "signature_proof",
        effectiveFrom: new Date(),
        uploadedByUserId: actorUserId,
      })
      .returning({ id: hrmDocument.id })

    envelopeDocumentId = doc?.id ?? null
    if (!envelopeDocumentId) {
      throw new FatalError("envelope_document_insert_failed")
    }

    await tx
      .update(hrmSignatureRequest)
      .set({
        signedEnvelopeDocumentId: envelopeDocumentId,
        derivedStatus: "signed",
        updatedAt: new Date(),
      })
      .where(eq(hrmSignatureRequest.id, request.id))

    if (request.kind === "contract") {
      await tx
        .update(hrmEmploymentContract)
        .set({
          signedDocumentId: envelopeDocumentId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(hrmEmploymentContract.organizationId, payload.organizationId),
            eq(hrmEmploymentContract.id, request.subjectId)
          )
        )
    }

    if (request.kind === "boarding_task") {
      await tx
        .update(hrmBoardingTask)
        .set({
          evidenceDocumentId: envelopeDocumentId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(hrmBoardingTask.organizationId, payload.organizationId),
            eq(hrmBoardingTask.id, request.subjectId)
          )
        )
    }

    await insertSignatureEvent(tx, {
      organizationId: payload.organizationId,
      requestId: request.id,
      type: "signature_request.completed",
      actor: { actorType: "system", actorUserId },
      data: {
        envelopeDocumentId,
        payloadHashSuffix: payloadHashSuffix(payloadHash),
      },
    })
  })

  if (request.kind === "boarding_task" && envelopeDocumentId) {
    const { onSignatureRequestSealedForBoardingTask } = await import(
      "#features/hrm/server"
    )
    await onSignatureRequestSealedForBoardingTask({
      organizationId: payload.organizationId,
      taskId: request.subjectId,
      actorUserId,
      evidenceDocumentId: envelopeDocumentId,
    })
  }

  await triggerSignatureWebhook({
    organizationId: payload.organizationId,
    requestId: request.id,
    eventType: "signature_request.completed",
  })

  await writeIamAuditEvent({
    action: auditActionForSignatureEvent("signature_request.completed"),
    actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "hrm_signature_request",
    resourceId: request.id,
    metadata: {
      envelopeDocumentId,
      payloadHashSuffix: payloadHashSuffix(payloadHash),
    },
  })
}

async function sealFailedStep(payload: SignatureSealPayload, err: unknown) {
  "use step"

  const errorCode =
    err instanceof Error ? err.message.slice(0, 120) : "unknown_error"

  await db.transaction(async (tx) => {
    await insertSignatureEvent(tx, {
      organizationId: payload.organizationId,
      requestId: payload.requestId,
      type: "signature_request.seal_failed",
      actor: { actorType: "system" },
      data: { errorCode },
    })
  })

  await triggerSignatureWebhook({
    organizationId: payload.organizationId,
    requestId: payload.requestId,
    eventType: "signature_request.seal_failed",
  })
}

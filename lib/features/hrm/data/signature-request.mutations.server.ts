import "server-only"

import { createHash, randomUUID } from "node:crypto"

import { and, asc, eq } from "drizzle-orm"

import { enqueueHrmSignatureSealWorkflowRun } from "#features/execution"
import { db } from "#lib/db"
import {
  hrmBoardingTask,
  hrmDocument,
  hrmEmploymentContract,
  hrmSignatureEvent,
  hrmSignatureParty,
  hrmSignatureRequest,
} from "#lib/db/schema"

import type {
  SignatureEventType,
  SignaturePartyRole,
  SignaturePartyRow,
  SignatureRequestKind,
  SignatureSigningOrder,
  SignatureSigningStatus,
} from "../schemas/signature.schema"
import { zSignatureEventDataV1 } from "../schemas/signature.schema"
import { stablePayrollCloseStringify } from "./payroll-close.shared"
import { nextSignatureReminderAt } from "./signature-reminder.shared"
import {
  allActionablePartiesSigned,
  assertSignaturePartyNotExpired,
  deriveSignatureRequestStatus,
  type SignaturePartyStatusProjection,
  isPartysTurnToSign,
  isSignaturePartyRoleActionable,
  signaturePartyIntentComplete,
  type SignaturePartyIntentInput,
} from "./signature-request-status.shared"
import { triggerSignatureWebhook } from "./signature-webhook.server"
import { auditActionForSignatureEvent } from "./signature-event-types.shared"

export type HrmSignatureDbExecutor = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export type SignaturePartyInput = {
  readonly signerOrder: number
  readonly signerEmployeeId?: string | null
  readonly signerEmail: string
  readonly signerName: string
  readonly role?: SignaturePartyRole
}

export type SignatureActorContext = {
  readonly actorType: "system" | "hr_admin" | "signer" | "provider_webhook"
  readonly actorUserId?: string | null
  readonly actorEmail?: string | null
  readonly actorName?: string | null
  readonly userAgent?: string | null
  readonly ipAddress?: string | null
}

function hashDeclarationText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

function hashEventPayload(data: Record<string, unknown>): string {
  return createHash("sha256")
    .update(stablePayrollCloseStringify(data), "utf8")
    .digest("hex")
}

function newPartyToken(): string {
  return randomUUID().replace(/-/g, "")
}

function newPublicSlug(): string {
  return randomUUID().replace(/-/g, "")
}

async function assertSubjectExists(
  organizationId: string,
  kind: SignatureRequestKind,
  subjectId: string
): Promise<void> {
  if (kind === "contract") {
    const [row] = await db
      .select({ id: hrmEmploymentContract.id })
      .from(hrmEmploymentContract)
      .where(
        and(
          eq(hrmEmploymentContract.organizationId, organizationId),
          eq(hrmEmploymentContract.id, subjectId)
        )
      )
      .limit(1)
    if (!row) {
      throw new Error("Employment contract not found for signature subject")
    }
    return
  }

  const [row] = await db
    .select({ id: hrmBoardingTask.id })
    .from(hrmBoardingTask)
    .where(
      and(
        eq(hrmBoardingTask.organizationId, organizationId),
        eq(hrmBoardingTask.id, subjectId)
      )
    )
    .limit(1)
  if (!row) {
    throw new Error("Boarding task not found for signature subject")
  }
}

async function assertDocumentBelongsToOrg(
  organizationId: string,
  documentId: string
): Promise<void> {
  const [row] = await db
    .select({ id: hrmDocument.id })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, organizationId),
        eq(hrmDocument.id, documentId)
      )
    )
    .limit(1)
  if (!row) {
    throw new Error("Source document not found")
  }
}

export async function insertSignatureEvent(
  tx: HrmSignatureDbExecutor,
  input: {
    readonly organizationId: string
    readonly requestId: string
    readonly partyId?: string | null
    readonly type: SignatureEventType
    readonly actor: SignatureActorContext
    readonly data: Record<string, unknown>
  }
): Promise<string> {
  const parsed = zSignatureEventDataV1.safeParse({
    type: input.type,
    requestId: input.requestId,
    organizationId: input.organizationId,
    data: input.data,
  })
  if (!parsed.success) {
    throw new Error("Invalid signature event payload shape")
  }

  const dataHash = hashEventPayload(input.data)
  const [inserted] = await tx
    .insert(hrmSignatureEvent)
    .values({
      organizationId: input.organizationId,
      requestId: input.requestId,
      partyId: input.partyId ?? null,
      type: input.type,
      actorType: input.actor.actorType,
      actorUserId: input.actor.actorUserId ?? null,
      actorEmail: input.actor.actorEmail ?? null,
      actorName: input.actor.actorName ?? null,
      userAgent: input.actor.userAgent ?? null,
      ipAddress: input.actor.ipAddress ?? null,
      data: input.data,
      dataHash,
    })
    .returning({ id: hrmSignatureEvent.id })

  const eventId = inserted?.id
  if (!eventId) {
    throw new Error("Failed to insert signature event")
  }

  await tx
    .update(hrmSignatureRequest)
    .set({ lastEventAt: new Date(), updatedAt: new Date() })
    .where(eq(hrmSignatureRequest.id, input.requestId))

  void auditActionForSignatureEvent(input.type)
  return eventId
}

async function recomputeRequestDerivedStatus(
  tx: HrmSignatureDbExecutor,
  organizationId: string,
  requestId: string
): Promise<string> {
  const [request] = await tx
    .select({
      derivedStatus: hrmSignatureRequest.derivedStatus,
    })
    .from(hrmSignatureRequest)
    .where(
      and(
        eq(hrmSignatureRequest.organizationId, organizationId),
        eq(hrmSignatureRequest.id, requestId)
      )
    )
    .limit(1)

  if (!request) {
    throw new Error("Signature request not found")
  }

  const parties = await tx
    .select({
      role: hrmSignatureParty.role,
      signingStatus: hrmSignatureParty.signingStatus,
      rejectionReason: hrmSignatureParty.rejectionReason,
    })
    .from(hrmSignatureParty)
    .where(
      and(
        eq(hrmSignatureParty.organizationId, organizationId),
        eq(hrmSignatureParty.requestId, requestId)
      )
    )

  const partyProjections: readonly SignaturePartyStatusProjection[] =
    parties.map((party) => ({
      role: party.role as SignaturePartyRole,
      signingStatus: party.signingStatus as SignatureSigningStatus,
      rejectionReason: party.rejectionReason,
    }))

  const derivedStatus = deriveSignatureRequestStatus(
    request.derivedStatus,
    partyProjections
  )

  await tx
    .update(hrmSignatureRequest)
    .set({ derivedStatus, updatedAt: new Date() })
    .where(eq(hrmSignatureRequest.id, requestId))

  return derivedStatus
}

async function activateNextSequentialParty(
  tx: HrmSignatureDbExecutor,
  input: {
    readonly organizationId: string
    readonly requestId: string
    readonly signingOrder: string
    readonly expirationPeriodDays: number | null
    readonly actorUserId: string | null
  }
): Promise<void> {
  if (input.signingOrder !== "sequential") {
    return
  }

  const parties = await tx
    .select()
    .from(hrmSignatureParty)
    .where(
      and(
        eq(hrmSignatureParty.organizationId, input.organizationId),
        eq(hrmSignatureParty.requestId, input.requestId)
      )
    )
    .orderBy(asc(hrmSignatureParty.signerOrder))

  const next = parties.find(
    (party) =>
      isSignaturePartyRoleActionable(party.role as SignaturePartyRole) &&
      party.signingStatus === "not_signed" &&
      party.sendStatus === "not_sent"
  )

  if (!next) {
    return
  }

  const sentAt = new Date()
  const expirationMs = (input.expirationPeriodDays ?? 30) * 24 * 60 * 60 * 1000
  const expiresAt = new Date(sentAt.getTime() + expirationMs)

  await tx
    .update(hrmSignatureParty)
    .set({
      sendStatus: "sent",
      sentAt,
      expiresAt,
      token: newPartyToken(),
      nextReminderAt: nextSignatureReminderAt(sentAt, 0),
      updatedAt: sentAt,
      updatedByUserId: input.actorUserId,
    })
    .where(eq(hrmSignatureParty.id, next.id))
}

export async function createSignatureRequest(input: {
  readonly organizationId: string
  readonly createdByUserId: string
  readonly kind: SignatureRequestKind
  readonly subjectId: string
  readonly documentId: string
  readonly signingOrder: SignatureSigningOrder
  readonly declarationText: string
  readonly expirationPeriodDays?: number
  readonly parties: readonly SignaturePartyInput[]
}): Promise<{ requestId: string; publicSlug: string }> {
  if (input.parties.length === 0) {
    throw new Error("At least one party is required")
  }

  await assertSubjectExists(input.organizationId, input.kind, input.subjectId)
  await assertDocumentBelongsToOrg(input.organizationId, input.documentId)

  const declarationTextHash = hashDeclarationText(input.declarationText)
  const publicSlug = newPublicSlug()

  return db.transaction(async (tx) => {
    const [request] = await tx
      .insert(hrmSignatureRequest)
      .values({
        publicSlug,
        organizationId: input.organizationId,
        kind: input.kind,
        subjectType: input.kind,
        subjectId: input.subjectId,
        signingOrder: input.signingOrder,
        documentId: input.documentId,
        declarationTextHash,
        expirationPeriodDays: input.expirationPeriodDays ?? null,
        derivedStatus: "draft",
        createdByUserId: input.createdByUserId,
        updatedByUserId: input.createdByUserId,
      })
      .returning({
        id: hrmSignatureRequest.id,
        publicSlug: hrmSignatureRequest.publicSlug,
      })

    const requestId = request?.id
    if (!requestId) {
      throw new Error("Failed to create signature request")
    }

    for (const party of input.parties) {
      await tx.insert(hrmSignatureParty).values({
        organizationId: input.organizationId,
        requestId,
        signerOrder: party.signerOrder,
        signerEmployeeId: party.signerEmployeeId ?? null,
        signerEmail: party.signerEmail,
        signerName: party.signerName,
        role: party.role ?? "signer",
        token: newPartyToken(),
        createdByUserId: input.createdByUserId,
        updatedByUserId: input.createdByUserId,
      })
    }

    await insertSignatureEvent(tx, {
      organizationId: input.organizationId,
      requestId,
      type: "signature_request.created",
      actor: {
        actorType: "hr_admin",
        actorUserId: input.createdByUserId,
      },
      data: {
        kind: input.kind,
        subjectId: input.subjectId,
        declarationText: input.declarationText,
      },
    })

    await triggerSignatureWebhook({
      organizationId: input.organizationId,
      requestId,
      eventType: "signature_request.created",
    })

    return { requestId, publicSlug: request.publicSlug }
  })
}

export async function sendSignatureRequest(input: {
  readonly organizationId: string
  readonly requestId: string
  readonly actorUserId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(hrmSignatureRequest)
      .where(
        and(
          eq(hrmSignatureRequest.organizationId, input.organizationId),
          eq(hrmSignatureRequest.id, input.requestId)
        )
      )
      .limit(1)

    if (!request || request.derivedStatus !== "draft") {
      throw new Error("Signature request is not in draft state")
    }

    const sentAt = new Date()
    const expirationMs =
      (request.expirationPeriodDays ?? 30) * 24 * 60 * 60 * 1000

    const parties = await tx
      .select()
      .from(hrmSignatureParty)
      .where(eq(hrmSignatureParty.requestId, input.requestId))
      .orderBy(asc(hrmSignatureParty.signerOrder))

    const actionable = parties.filter((party) =>
      isSignaturePartyRoleActionable(party.role as SignaturePartyRole)
    )

    const partiesToSend =
      request.signingOrder === "sequential"
        ? actionable.slice(0, 1)
        : actionable

    for (const party of parties) {
      const shouldSend = partiesToSend.some((row) => row.id === party.id)
      if (!shouldSend) {
        continue
      }

      const expiresAt = new Date(sentAt.getTime() + expirationMs)
      await tx
        .update(hrmSignatureParty)
        .set({
          sendStatus: "sent",
          sentAt,
          expiresAt,
          token: newPartyToken(),
          nextReminderAt: nextSignatureReminderAt(sentAt, 0),
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        })
        .where(eq(hrmSignatureParty.id, party.id))
    }

    await tx
      .update(hrmSignatureRequest)
      .set({
        derivedStatus: "sent",
        sentAt,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmSignatureRequest.id, input.requestId))

    await insertSignatureEvent(tx, {
      organizationId: input.organizationId,
      requestId: input.requestId,
      type: "signature_request.sent",
      actor: {
        actorType: "hr_admin",
        actorUserId: input.actorUserId,
      },
      data: { partyCount: parties.length },
    })

    await triggerSignatureWebhook({
      organizationId: input.organizationId,
      requestId: input.requestId,
      eventType: "signature_request.sent",
    })
  })
}

export async function resendSignaturePartyToken(input: {
  readonly organizationId: string
  readonly requestId: string
  readonly partyId: string
  readonly actorUserId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [party] = await tx
      .select()
      .from(hrmSignatureParty)
      .where(
        and(
          eq(hrmSignatureParty.organizationId, input.organizationId),
          eq(hrmSignatureParty.requestId, input.requestId),
          eq(hrmSignatureParty.id, input.partyId)
        )
      )
      .limit(1)

    if (!party || party.sendStatus !== "sent") {
      throw new Error("Party is not eligible for resend")
    }

    await tx
      .update(hrmSignatureParty)
      .set({
        token: newPartyToken(),
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmSignatureParty.id, party.id))
  })
}

export async function voidSignatureRequest(input: {
  readonly organizationId: string
  readonly requestId: string
  readonly actorUserId: string
  readonly reason?: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [request] = await tx
      .select({ derivedStatus: hrmSignatureRequest.derivedStatus })
      .from(hrmSignatureRequest)
      .where(
        and(
          eq(hrmSignatureRequest.organizationId, input.organizationId),
          eq(hrmSignatureRequest.id, input.requestId)
        )
      )
      .limit(1)

    if (
      !request ||
      request.derivedStatus === "voided" ||
      request.derivedStatus === "signed"
    ) {
      throw new Error("Signature request cannot be voided")
    }

    await tx
      .update(hrmSignatureRequest)
      .set({
        derivedStatus: "voided",
        voidedAt: new Date(),
        voidReason: input.reason ?? null,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmSignatureRequest.id, input.requestId))

    await insertSignatureEvent(tx, {
      organizationId: input.organizationId,
      requestId: input.requestId,
      type: "signature_request.cancelled",
      actor: {
        actorType: "hr_admin",
        actorUserId: input.actorUserId,
      },
      data: { reason: input.reason },
    })

    await triggerSignatureWebhook({
      organizationId: input.organizationId,
      requestId: input.requestId,
      eventType: "signature_request.cancelled",
    })
  })
}

export async function recordSignaturePartyView(input: {
  readonly organizationId: string
  readonly partyId: string
  readonly actor: SignatureActorContext
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [party] = await tx
      .select()
      .from(hrmSignatureParty)
      .where(
        and(
          eq(hrmSignatureParty.organizationId, input.organizationId),
          eq(hrmSignatureParty.id, input.partyId)
        )
      )
      .limit(1)

    if (!party) {
      throw new Error("Signature party not found")
    }

    assertSignaturePartyNotExpired(party)

    const now = new Date()
    const updates: Partial<typeof hrmSignatureParty.$inferInsert> = {
      updatedAt: now,
    }

    const isFirstOpen = party.readStatus === "not_opened"
    if (isFirstOpen) {
      updates.readStatus = "opened"
      updates.firstOpenedAt = now
    }

    await tx
      .update(hrmSignatureParty)
      .set(updates)
      .where(eq(hrmSignatureParty.id, party.id))

    const eventType = isFirstOpen
      ? "signature_request.opened"
      : "signature_request.viewed"

    await insertSignatureEvent(tx, {
      organizationId: input.organizationId,
      requestId: party.requestId,
      partyId: party.id,
      type: eventType,
      actor: input.actor,
      data: {
        partyId: party.id,
        recipientEmail: party.signerEmail,
      },
    })

    await triggerSignatureWebhook({
      organizationId: input.organizationId,
      requestId: party.requestId,
      eventType,
    })
  })
}

export async function completeSignatureParty(input: {
  readonly organizationId: string
  readonly partyId: string
  readonly declarationTextHash: string
  readonly intent: SignaturePartyIntentInput
  readonly actor: SignatureActorContext
  readonly locale: string
}): Promise<{ sealed: boolean; requestId: string }> {
  if (!signaturePartyIntentComplete(input.intent)) {
    throw new Error("Signature intent is incomplete")
  }

  return db.transaction(async (tx) => {
    const [party] = await tx
      .select()
      .from(hrmSignatureParty)
      .where(
        and(
          eq(hrmSignatureParty.organizationId, input.organizationId),
          eq(hrmSignatureParty.id, input.partyId)
        )
      )
      .limit(1)

    if (!party) {
      throw new Error("Signature party not found")
    }

    assertSignaturePartyNotExpired(party)

    if (party.signingStatus !== "not_signed" || party.sendStatus !== "sent") {
      throw new Error("Party is not eligible to sign")
    }

    const [request] = await tx
      .select()
      .from(hrmSignatureRequest)
      .where(eq(hrmSignatureRequest.id, party.requestId))
      .limit(1)

    if (!request || request.derivedStatus === "voided") {
      throw new Error("Signature request is not open")
    }

    if (request.declarationTextHash !== input.declarationTextHash) {
      throw new Error("Declaration text hash mismatch")
    }

    const allParties = await tx
      .select({
        id: hrmSignatureParty.id,
        signerOrder: hrmSignatureParty.signerOrder,
        signingStatus: hrmSignatureParty.signingStatus,
        role: hrmSignatureParty.role,
      })
      .from(hrmSignatureParty)
      .where(eq(hrmSignatureParty.requestId, party.requestId))

    if (
      !isPartysTurnToSign(
        party as Pick<
          SignaturePartyRow,
          "signerOrder" | "signingStatus" | "role"
        >,
        allParties as readonly Pick<
          SignaturePartyRow,
          "signerOrder" | "signingStatus" | "role"
        >[],
        request.signingOrder as SignatureSigningOrder
      )
    ) {
      throw new Error("It is not this party's turn to sign")
    }

    const signedAt = new Date()
    const proofEventId = await insertSignatureEvent(tx, {
      organizationId: input.organizationId,
      requestId: party.requestId,
      partyId: party.id,
      type: "signature_request.recipient_completed",
      actor: input.actor,
      data: {
        partyId: party.id,
        recipientEmail: party.signerEmail,
        typedName: input.intent.typedName ?? null,
        drawnSignatureSha256: input.intent.drawnSignatureSha256 ?? null,
        declarationTextHash: input.declarationTextHash,
      },
    })

    await tx
      .update(hrmSignatureParty)
      .set({
        signingStatus: "signed",
        signedAt,
        signedProofEventId: proofEventId,
        updatedAt: signedAt,
      })
      .where(eq(hrmSignatureParty.id, party.id))

    await recomputeRequestDerivedStatus(
      tx,
      input.organizationId,
      party.requestId
    )

    await triggerSignatureWebhook({
      organizationId: input.organizationId,
      requestId: party.requestId,
      eventType: "signature_request.recipient_completed",
    })

    const refreshedParties = await tx
      .select({
        role: hrmSignatureParty.role,
        signingStatus: hrmSignatureParty.signingStatus,
      })
      .from(hrmSignatureParty)
      .where(eq(hrmSignatureParty.requestId, party.requestId))

    const shouldSeal = allActionablePartiesSigned(
      refreshedParties as readonly Pick<
        SignaturePartyRow,
        "role" | "signingStatus"
      >[]
    )

    if (!shouldSeal) {
      await activateNextSequentialParty(tx, {
        organizationId: input.organizationId,
        requestId: party.requestId,
        signingOrder: request.signingOrder,
        expirationPeriodDays: request.expirationPeriodDays,
        actorUserId: input.actor.actorUserId ?? null,
      })
    }

    if (shouldSeal) {
      await enqueueHrmSignatureSealWorkflowRun({
        organizationId: input.organizationId,
        requestId: party.requestId,
        schemaVersion: request.schemaVersion,
        actorUserId: input.actor.actorUserId ?? null,
        actorSessionId: null,
      })
    }

    return { sealed: shouldSeal, requestId: party.requestId }
  })
}

export async function rejectSignatureParty(input: {
  readonly organizationId: string
  readonly partyId: string
  readonly reason: string
  readonly actor: SignatureActorContext
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [party] = await tx
      .select()
      .from(hrmSignatureParty)
      .where(
        and(
          eq(hrmSignatureParty.organizationId, input.organizationId),
          eq(hrmSignatureParty.id, input.partyId)
        )
      )
      .limit(1)

    if (!party) {
      throw new Error("Signature party not found")
    }

    assertSignaturePartyNotExpired(party)

    if (party.signingStatus !== "not_signed") {
      throw new Error("Party cannot reject in current state")
    }

    await tx
      .update(hrmSignatureParty)
      .set({
        signingStatus: "rejected",
        rejectionReason: input.reason,
        updatedAt: new Date(),
      })
      .where(eq(hrmSignatureParty.id, party.id))

    await insertSignatureEvent(tx, {
      organizationId: input.organizationId,
      requestId: party.requestId,
      partyId: party.id,
      type: "signature_request.rejected",
      actor: input.actor,
      data: { partyId: party.id, reason: input.reason },
    })

    await recomputeRequestDerivedStatus(
      tx,
      input.organizationId,
      party.requestId
    )

    await triggerSignatureWebhook({
      organizationId: input.organizationId,
      requestId: party.requestId,
      eventType: "signature_request.rejected",
    })
  })
}

export async function expireSignatureParty(input: {
  readonly organizationId: string
  readonly partyId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [party] = await tx
      .select()
      .from(hrmSignatureParty)
      .where(
        and(
          eq(hrmSignatureParty.organizationId, input.organizationId),
          eq(hrmSignatureParty.id, input.partyId)
        )
      )
      .limit(1)

    if (!party || party.signingStatus !== "not_signed") {
      return
    }

    await tx
      .update(hrmSignatureParty)
      .set({
        signingStatus: "rejected",
        rejectionReason: "expired",
        updatedAt: new Date(),
      })
      .where(eq(hrmSignatureParty.id, party.id))

    await insertSignatureEvent(tx, {
      organizationId: input.organizationId,
      requestId: party.requestId,
      partyId: party.id,
      type: "signature_request.expired",
      actor: { actorType: "system" },
      data: { partyId: party.id },
    })

    await recomputeRequestDerivedStatus(
      tx,
      input.organizationId,
      party.requestId
    )

    await triggerSignatureWebhook({
      organizationId: input.organizationId,
      requestId: party.requestId,
      eventType: "signature_request.expired",
    })
  })
}

export async function sendSignaturePartyReminder(input: {
  readonly organizationId: string
  readonly partyId: string
  readonly reminderIndex: number
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [party] = await tx
      .select()
      .from(hrmSignatureParty)
      .where(
        and(
          eq(hrmSignatureParty.organizationId, input.organizationId),
          eq(hrmSignatureParty.id, input.partyId)
        )
      )
      .limit(1)

    if (
      !party ||
      party.signingStatus !== "not_signed" ||
      party.sendStatus !== "sent" ||
      !party.sentAt
    ) {
      return
    }

    const now = new Date()
    const nextAt = nextSignatureReminderAt(
      party.sentAt,
      input.reminderIndex + 1
    )

    await tx
      .update(hrmSignatureParty)
      .set({
        lastReminderSentAt: now,
        nextReminderAt: nextAt,
        updatedAt: now,
      })
      .where(eq(hrmSignatureParty.id, party.id))

    await insertSignatureEvent(tx, {
      organizationId: input.organizationId,
      requestId: party.requestId,
      partyId: party.id,
      type: "signature_request.reminder_sent",
      actor: { actorType: "system" },
      data: {
        partyId: party.id,
        reminderIndex: input.reminderIndex,
      },
    })

    await triggerSignatureWebhook({
      organizationId: input.organizationId,
      requestId: party.requestId,
      eventType: "signature_request.reminder_sent",
    })
  })
}

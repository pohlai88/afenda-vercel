import { z } from "zod"

export const SIGNATURE_REQUEST_KINDS = ["contract", "boarding_task"] as const
export type SignatureRequestKind = (typeof SIGNATURE_REQUEST_KINDS)[number]

export const SIGNATURE_SIGNING_ORDERS = ["parallel", "sequential"] as const
export type SignatureSigningOrder = (typeof SIGNATURE_SIGNING_ORDERS)[number]

export const SIGNATURE_DERIVED_STATUSES = [
  "draft",
  "sent",
  "partially_signed",
  "signed",
  "rejected",
  "expired",
  "voided",
] as const
export type SignatureDerivedStatus = (typeof SIGNATURE_DERIVED_STATUSES)[number]

export const SIGNATURE_PARTY_ROLES = [
  "signer",
  "approver",
  "viewer",
  "cc",
] as const
export type SignaturePartyRole = (typeof SIGNATURE_PARTY_ROLES)[number]

export const SIGNATURE_READ_STATUSES = ["not_opened", "opened"] as const
export type SignatureReadStatus = (typeof SIGNATURE_READ_STATUSES)[number]

export const SIGNATURE_SEND_STATUSES = ["not_sent", "sent"] as const
export type SignatureSendStatus = (typeof SIGNATURE_SEND_STATUSES)[number]

export const SIGNATURE_SIGNING_STATUSES = [
  "not_signed",
  "signed",
  "rejected",
] as const
export type SignatureSigningStatus = (typeof SIGNATURE_SIGNING_STATUSES)[number]

export const SIGNATURE_EVENT_TYPES = [
  "signature_request.created",
  "signature_request.sent",
  "signature_request.opened",
  "signature_request.viewed",
  "signature_request.recipient_completed",
  "signature_request.completed",
  "signature_request.rejected",
  "signature_request.cancelled",
  "signature_request.expired",
  "signature_request.reminder_sent",
  "signature_request.seal_failed",
  "signature_request.provider_callback",
] as const
export type SignatureEventType = (typeof SIGNATURE_EVENT_TYPES)[number]

export const signaturePartyRowSchema = z.object({
  id: z.string().min(1),
  signerOrder: z.number().int().positive(),
  signerEmployeeId: z.string().nullable(),
  signerEmail: z.string().email(),
  signerName: z.string().min(1),
  role: z.enum(SIGNATURE_PARTY_ROLES),
  readStatus: z.enum(SIGNATURE_READ_STATUSES),
  sendStatus: z.enum(SIGNATURE_SEND_STATUSES),
  signingStatus: z.enum(SIGNATURE_SIGNING_STATUSES),
  expiresAt: z.date().nullable().optional(),
})

export type SignaturePartyRow = z.infer<typeof signaturePartyRowSchema>

export const subjectSummaryV1Schema = z.object({
  label: z.string().min(1),
  employeeId: z.string().nullable().optional(),
  contractId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
})

export const signedEnvelopeV1Schema = z.object({
  version: z.literal("1"),
  signatureRequestId: z.string().min(1),
  organizationId: z.string().min(1),
  subject: z.object({
    type: z.enum(SIGNATURE_REQUEST_KINDS),
    id: z.string().min(1),
    summary: subjectSummaryV1Schema,
  }),
  sourceDocument: z.object({
    id: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  }),
  declaration: z.object({
    textSha256: z.string().regex(/^[a-f0-9]{64}$/i),
    locale: z.string().min(2),
  }),
  parties: z
    .array(
      z.object({
        partyId: z.string().min(1),
        order: z.number().int().positive(),
        employeeId: z.string().nullable(),
        email: z.string().email(),
        displayName: z.string().min(1),
        signedAt: z.string().datetime(),
        intent: z.object({
          ip: z.string().nullable(),
          userAgent: z.string().nullable(),
          locale: z.string().min(2),
        }),
        typedName: z.string().nullable(),
        drawnSignatureSha256: z
          .string()
          .regex(/^[a-f0-9]{64}$/i)
          .nullable(),
      })
    )
    .min(1),
  ceremonyCompletedAt: z.string().datetime(),
})

export type SignedEnvelopeV1 = z.infer<typeof signedEnvelopeV1Schema>

const signatureEventBaseSchema = z.object({
  requestId: z.string().min(1),
  organizationId: z.string().min(1),
})

export const zSignatureEventDataV1 = z.discriminatedUnion("type", [
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.created"),
    data: z.object({
      kind: z.enum(SIGNATURE_REQUEST_KINDS),
      subjectId: z.string(),
      declarationText: z.string().min(1),
    }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.sent"),
    data: z.object({ partyCount: z.number().int().nonnegative() }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.opened"),
    data: z.object({ partyId: z.string(), recipientEmail: z.string() }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.viewed"),
    data: z.object({ partyId: z.string(), recipientEmail: z.string() }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.recipient_completed"),
    data: z.object({
      partyId: z.string(),
      recipientEmail: z.string(),
      typedName: z.string().nullable(),
      drawnSignatureSha256: z.string().nullable(),
      declarationTextHash: z.string(),
    }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.completed"),
    data: z.object({
      envelopeDocumentId: z.string(),
      payloadHashSuffix: z.string().max(12),
    }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.rejected"),
    data: z.object({ partyId: z.string(), reason: z.string() }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.cancelled"),
    data: z.object({ reason: z.string().optional() }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.expired"),
    data: z.object({ partyId: z.string().optional() }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.reminder_sent"),
    data: z.object({ partyId: z.string(), reminderIndex: z.number().int() }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.seal_failed"),
    data: z.object({ errorCode: z.string() }),
  }),
  signatureEventBaseSchema.extend({
    type: z.literal("signature_request.provider_callback"),
    data: z.object({ externalReference: z.string().nullable() }),
  }),
])

export type SignatureEventDataV1 = z.infer<typeof zSignatureEventDataV1>

export const createSignatureRequestFormSchema = z.object({
  orgSlug: z.string().min(1),
  kind: z.enum(SIGNATURE_REQUEST_KINDS),
  subjectId: z.string().uuid(),
  documentId: z.string().uuid(),
  signingOrder: z.enum(SIGNATURE_SIGNING_ORDERS).default("parallel"),
  declarationText: z.string().min(10),
  expirationPeriodDays: z.coerce.number().int().min(1).max(90).optional(),
  partiesJson: z.string().min(2),
})

export const sendSignatureRequestFormSchema = z.object({
  orgSlug: z.string().min(1),
  requestId: z.string().uuid(),
})

export const portalSignatureIntentSchema = z.object({
  portalSlug: z.string().min(1),
  partyToken: z.string().min(16),
  typedName: z.string().min(1).optional(),
  drawnSignatureSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
  declarationAcknowledged: z.literal(true),
  consentAt: z.string().datetime(),
})

export const portalSignatureDeclineSchema = z.object({
  portalSlug: z.string().min(1),
  partyToken: z.string().min(16),
  reason: z.string().min(3).max(500),
})

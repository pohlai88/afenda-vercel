"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import {
  createSignatureRequest,
  resendSignaturePartyToken,
  sendSignatureRequest,
  voidSignatureRequest,
  type SignaturePartyInput,
} from "../data/signature-request.mutations.server"
import { auditActionForSignatureEvent } from "../data/signature-event-types.shared"
import {
  createSignatureRequestFormSchema,
  sendSignatureRequestFormSchema,
  SIGNATURE_PARTY_ROLES,
} from "../schemas/signature.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { SignatureMutationFormState } from "../types"

const voidSignatureRequestFormSchema = z.object({
  orgSlug: z.string().min(1),
  requestId: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

const resendPartyFormSchema = z.object({
  orgSlug: z.string().min(1),
  requestId: z.string().uuid(),
  partyId: z.string().uuid(),
})

const partyInputSchema = z.array(
  z.object({
    signerOrder: z.number().int().positive(),
    signerEmployeeId: z.string().uuid().nullable().optional(),
    signerEmail: z.string().email(),
    signerName: z.string().min(1),
    role: z.enum(SIGNATURE_PARTY_ROLES).optional(),
  })
)

function revalidateSignatureSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/signatures"),
    "page"
  )
}

export async function createSignatureRequestAction(
  _prev: SignatureMutationFormState | undefined,
  formData: FormData
): Promise<SignatureMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response

  const perm = await requireHrmPermission({
    object: "signature",
    function: "create",
    errorMessage: "Signature create permission required.",
  })
  if (!perm.ok) {
    return hrmActionFailure({ form: perm.error })
  }

  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = createSignatureRequestFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    kind: formData.get("kind"),
    subjectId: formData.get("subjectId"),
    documentId: formData.get("documentId"),
    signingOrder: formData.get("signingOrder") ?? "parallel",
    declarationText: formData.get("declarationText"),
    expirationPeriodDays: formData.get("expirationPeriodDays") || undefined,
    partiesJson: formData.get("partiesJson"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid signature request.",
    })
  }

  let parties: SignaturePartyInput[]
  try {
    const raw = JSON.parse(parsed.data.partiesJson) as unknown
    const partyParsed = partyInputSchema.safeParse(raw)
    if (!partyParsed.success) {
      return hrmActionFailure({ form: "Invalid parties JSON." })
    }
    parties = partyParsed.data
  } catch {
    return hrmActionFailure({ form: "Parties must be valid JSON." })
  }

  try {
    const { requestId } = await createSignatureRequest({
      organizationId,
      createdByUserId: userId,
      kind: parsed.data.kind,
      subjectId: parsed.data.subjectId,
      documentId: parsed.data.documentId,
      signingOrder: parsed.data.signingOrder,
      declarationText: parsed.data.declarationText,
      expirationPeriodDays: parsed.data.expirationPeriodDays,
      parties,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: auditActionForSignatureEvent("signature_request.created"),
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_signature_request",
        resourceId: requestId,
        metadata: {
          kind: parsed.data.kind,
          subjectId: parsed.data.subjectId,
        },
      })
    )

    revalidateSignatureSurfaces()
    return { ok: true, requestId }
  } catch (err) {
    return hrmActionFailure({
      form:
        err instanceof Error
          ? err.message
          : "Failed to create signature request.",
    })
  }
}

export async function sendSignatureRequestAction(
  _prev: SignatureMutationFormState | undefined,
  formData: FormData
): Promise<SignatureMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response

  const perm = await requireHrmPermission({
    object: "signature",
    function: "update",
  })
  if (!perm.ok) {
    return hrmActionFailure({ form: perm.error })
  }

  const parsed = sendSignatureRequestFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    requestId: formData.get("requestId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid send request." })
  }

  const { organizationId, userId, sessionId } = perm.session

  try {
    await sendSignatureRequest({
      organizationId,
      requestId: parsed.data.requestId,
      actorUserId: userId,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: auditActionForSignatureEvent("signature_request.sent"),
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_signature_request",
        resourceId: parsed.data.requestId,
        metadata: {},
      })
    )

    revalidateSignatureSurfaces()
    return { ok: true, requestId: parsed.data.requestId }
  } catch (err) {
    return hrmActionFailure({
      form:
        err instanceof Error
          ? err.message
          : "Failed to send signature request.",
    })
  }
}

export async function resendSignaturePartyAction(
  _prev: SignatureMutationFormState | undefined,
  formData: FormData
): Promise<SignatureMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response

  const perm = await requireHrmPermission({
    object: "signature",
    function: "update",
  })
  if (!perm.ok) {
    return hrmActionFailure({ form: perm.error })
  }

  const parsed = resendPartyFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    requestId: formData.get("requestId"),
    partyId: formData.get("partyId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid resend request." })
  }

  try {
    await resendSignaturePartyToken({
      organizationId: perm.session.organizationId,
      requestId: parsed.data.requestId,
      partyId: parsed.data.partyId,
      actorUserId: perm.session.userId,
    })
    revalidateSignatureSurfaces()
    return { ok: true }
  } catch (err) {
    return hrmActionFailure({
      form:
        err instanceof Error ? err.message : "Failed to resend party token.",
    })
  }
}

export async function cancelSignatureRequestAction(
  _prev: SignatureMutationFormState | undefined,
  formData: FormData
): Promise<SignatureMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response

  const perm = await requireHrmPermission({
    object: "signature",
    function: "delete",
  })
  if (!perm.ok) {
    return hrmActionFailure({ form: perm.error })
  }

  const parsed = voidSignatureRequestFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    requestId: formData.get("requestId"),
    reason: formData.get("reason") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid cancel request." })
  }

  const { organizationId, userId, sessionId } = perm.session

  try {
    await voidSignatureRequest({
      organizationId,
      requestId: parsed.data.requestId,
      actorUserId: userId,
      reason: parsed.data.reason,
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: auditActionForSignatureEvent("signature_request.cancelled"),
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_signature_request",
        resourceId: parsed.data.requestId,
        metadata: { reason: parsed.data.reason },
      })
    )

    revalidateSignatureSurfaces()
    return { ok: true }
  } catch (err) {
    return hrmActionFailure({
      form:
        err instanceof Error
          ? err.message
          : "Failed to cancel signature request.",
    })
  }
}

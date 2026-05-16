"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { requireRecentAuthStepUp } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocalePath,
  toLocaleOrgDashboardRevalidatePattern,
} from "#lib/i18n/locales.shared"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { signaturePartyMatchesPortalSession } from "../data/signature-portal-access.shared"
import { getSignaturePartyByToken } from "../data/signature-request.queries.server"
import {
  completeSignatureParty,
  recordSignaturePartyView,
  rejectSignatureParty,
} from "../data/signature-request.mutations.server"
import {
  portalSignatureDeclineSchema,
  portalSignatureIntentSchema,
} from "../schemas/signature.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { SignatureMutationFormState } from "../types"

function revalidateSignaturePortalSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/signatures"),
    "page"
  )
  revalidatePath(
    toLocalePortalRevalidatePattern("/employee/signatures"),
    "page"
  )
}

async function resolvePortalActor() {
  const h = await headers()
  return {
    userAgent: h.get("user-agent"),
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
  }
}

export async function recordPortalSignatureViewAction(
  formData: FormData
): Promise<SignatureMutationFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  const partyToken = formData.get("partyToken")
  if (
    typeof rawPortalSlug !== "string" ||
    typeof partyToken !== "string" ||
    partyToken.length < 16
  ) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const row = await getSignaturePartyByToken(partyToken)
  if (
    !row ||
    row.request.organizationId !== context.portal.organizationId ||
    !signaturePartyMatchesPortalSession(row.party, context)
  ) {
    return hrmActionFailure({ form: "Signature invitation not found." })
  }

  const { userAgent, ipAddress } = await resolvePortalActor()

  try {
    await recordSignaturePartyView({
      organizationId: context.portal.organizationId,
      partyId: row.party.id,
      actor: {
        actorType: "signer",
        actorUserId: context.portal.userId,
        actorEmail: row.party.signerEmail,
        actorName: row.party.signerName,
        userAgent,
        ipAddress,
      },
    })
    return { ok: true }
  } catch (err) {
    return hrmActionFailure({
      form: err instanceof Error ? err.message : "Unable to record view.",
    })
  }
}

export async function submitPortalSignatureAction(
  _prev: SignatureMutationFormState | undefined,
  formData: FormData
): Promise<SignatureMutationFormState> {
  const parsed = portalSignatureIntentSchema.safeParse({
    portalSlug: formData.get("portalSlug"),
    partyToken: formData.get("partyToken"),
    typedName: formData.get("typedName") || undefined,
    drawnSignatureSha256: formData.get("drawnSignatureSha256") || undefined,
    declarationAcknowledged: formData.get("declarationAcknowledged") === "true",
    consentAt: formData.get("consentAt"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid signature submission.",
    })
  }

  const context = await getEmployeePortalContext(parsed.data.portalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const locale = await getRequestAppLocale()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(
      locale,
      `/p/${parsed.data.portalSlug}/employee/signatures/${parsed.data.partyToken}`
    ),
  })

  const row = await getSignaturePartyByToken(parsed.data.partyToken)
  if (
    !row ||
    row.request.organizationId !== context.portal.organizationId ||
    !signaturePartyMatchesPortalSession(row.party, context)
  ) {
    return hrmActionFailure({ form: "Signature invitation not found." })
  }

  const { userAgent, ipAddress } = await resolvePortalActor()

  try {
    return await withEmployeePortalActionSpan(
      context,
      "signatures",
      "submit",
      async () => {
        const result = await completeSignatureParty({
          organizationId: context.portal.organizationId,
          partyId: row.party.id,
          declarationTextHash: row.request.declarationTextHash,
          intent: {
            typedName: parsed.data.typedName ?? null,
            drawnSignatureSha256: parsed.data.drawnSignatureSha256 ?? null,
            declarationAcknowledged: parsed.data.declarationAcknowledged,
            consentAt: parsed.data.consentAt,
          },
          actor: {
            actorType: "signer",
            actorUserId: context.portal.userId,
            actorEmail: row.party.signerEmail,
            actorName: row.party.signerName,
            userAgent,
            ipAddress,
          },
          locale: "en",
        })

        revalidateSignaturePortalSurfaces()

        return { ok: true, requestId: result.requestId, sealed: result.sealed }
      }
    )
  } catch (err) {
    return hrmActionFailure({
      form: err instanceof Error ? err.message : "Unable to submit signature.",
    })
  }
}

export async function declinePortalSignatureAction(
  _prev: SignatureMutationFormState | undefined,
  formData: FormData
): Promise<SignatureMutationFormState> {
  const parsed = portalSignatureDeclineSchema.safeParse({
    portalSlug: formData.get("portalSlug"),
    partyToken: formData.get("partyToken"),
    reason: formData.get("reason"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid decline request.",
    })
  }

  const context = await getEmployeePortalContext(parsed.data.portalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const row = await getSignaturePartyByToken(parsed.data.partyToken)
  if (
    !row ||
    row.request.organizationId !== context.portal.organizationId ||
    !signaturePartyMatchesPortalSession(row.party, context)
  ) {
    return hrmActionFailure({ form: "Signature invitation not found." })
  }

  const { userAgent, ipAddress } = await resolvePortalActor()

  try {
    return await withEmployeePortalActionSpan(
      context,
      "signatures",
      "decline",
      async () => {
        await rejectSignatureParty({
          organizationId: context.portal.organizationId,
          partyId: row.party.id,
          reason: parsed.data.reason,
          actor: {
            actorType: "signer",
            actorUserId: context.portal.userId,
            actorEmail: row.party.signerEmail,
            actorName: row.party.signerName,
            userAgent,
            ipAddress,
          },
        })

        revalidateSignaturePortalSurfaces()

        return { ok: true }
      }
    )
  } catch (err) {
    return hrmActionFailure({
      form: err instanceof Error ? err.message : "Unable to decline signature.",
    })
  }
}

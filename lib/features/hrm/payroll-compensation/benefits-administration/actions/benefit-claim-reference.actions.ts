"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_BENEFIT_AUDIT } from "../benefit.contract"
import { insertBenefitClaimReference } from "../data/benefit-claim-reference.mutations.server"
import { updateBenefitClaimReferenceRow } from "../data/benefit-claim-reference.mutations.server"
import { getBenefitEnrollmentForOrganization } from "../data/benefit.queries.server"
import { requireHrmAdmin } from "../../../hrm-admin-guard.server"
import {
  createBenefitClaimReferenceFormSchema,
  updateBenefitClaimReferenceFormSchema,
} from "../schema/benefit.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { BenefitEnrollmentTransitionFormState } from "../../../types"

function revalidateBenefits() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/benefits"),
    "layout"
  )
}

function toMoneyString(value: number | undefined): string | null {
  if (value === undefined) return null
  return value.toFixed(2)
}

export async function createBenefitClaimReferenceAction(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const documentIds = formData
    .getAll("documentIds")
    .map((v) => String(v))
    .filter(Boolean)

  const parsed = createBenefitClaimReferenceFormSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    providerId: formData.get("providerId"),
    externalClaimId: formData.get("externalClaimId"),
    claimStatus: formData.get("claimStatus"),
    claimedAmount: formData.get("claimedAmount"),
    currency: formData.get("currency"),
    paymentReference: formData.get("paymentReference"),
    documentIds,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const data = parsed.data
  const enrollment = await getBenefitEnrollmentForOrganization(
    organizationId,
    data.enrollmentId
  )
  if (!enrollment) {
    return hrmActionFailure({ form: "Enrollment not found." })
  }

  const row = await insertBenefitClaimReference({
    organizationId,
    enrollmentId: data.enrollmentId,
    providerId: data.providerId ?? null,
    externalClaimId: data.externalClaimId.trim(),
    claimStatus: data.claimStatus,
    claimedAmount: toMoneyString(data.claimedAmount),
    currency: data.currency,
    paymentReference: data.paymentReference?.trim() ?? null,
    documentIds: data.documentIds ?? [],
    createdByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.claim_reference.create,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_claim_reference",
      resourceId: row.id,
      metadata: {
        enrollmentId: data.enrollmentId,
        externalClaimId: data.externalClaimId.trim(),
        claimStatus: data.claimStatus,
      },
    })
  )

  revalidateBenefits()
  return { ok: true }
}

export async function updateBenefitClaimReferenceAction(
  _prev: BenefitEnrollmentTransitionFormState | undefined,
  formData: FormData
): Promise<BenefitEnrollmentTransitionFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const documentIds = formData
    .getAll("documentIds")
    .map((v) => String(v))
    .filter(Boolean)

  const parsed = updateBenefitClaimReferenceFormSchema.safeParse({
    claimReferenceId: formData.get("claimReferenceId"),
    claimStatus: formData.get("claimStatus"),
    claimedAmount: formData.get("claimedAmount"),
    paymentReference: formData.get("paymentReference"),
    documentIds,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const data = parsed.data
  await updateBenefitClaimReferenceRow({
    organizationId,
    claimReferenceId: data.claimReferenceId,
    claimStatus: data.claimStatus,
    claimedAmount: toMoneyString(data.claimedAmount),
    paymentReference: data.paymentReference?.trim() ?? null,
    documentIds: data.documentIds ?? [],
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.claim_reference.update,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_claim_reference",
      resourceId: data.claimReferenceId,
      metadata: { claimStatus: data.claimStatus },
    })
  )

  revalidateBenefits()
  return { ok: true }
}

"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_BENEFIT_AUDIT } from "../benefit.contract"
import { requireHrmAdmin } from "../../../_module-governance/hrm-admin-guard.server"
import {
  closeBenefitOpenEnrollmentFormSchema,
  createBenefitOpenEnrollmentFormSchema,
} from "../schemas/benefit.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import {
  closeBenefitOpenEnrollmentWindow,
  insertBenefitOpenEnrollmentWindow,
} from "../data/benefit-open-enrollment.mutations.server"
import { getBenefitPlanForOrganization } from "../data/benefit.queries.server"

export type BenefitOpenEnrollmentFormState =
  | { ok: true; windowId: string }
  | {
      ok: false
      errors: {
        form?: string
        name?: string
        startsOn?: string
        endsOn?: string
        windowId?: string
      }
    }

function revalidateBenefits() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/benefits"), "layout")
}

function parseIsoDateStart(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`)
}

export async function createBenefitOpenEnrollmentAction(
  _prev: BenefitOpenEnrollmentFormState | undefined,
  formData: FormData
): Promise<BenefitOpenEnrollmentFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const planIds = formData
    .getAll("planIds")
    .map((value) => String(value))
    .filter(Boolean)

  const parsed = createBenefitOpenEnrollmentFormSchema.safeParse({
    name: formData.get("name"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
    planIds,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
      name: fe.name?.[0],
      startsOn: fe.startsOn?.[0],
      endsOn: fe.endsOn?.[0],
    })
  }

  const startsOn = parseIsoDateStart(parsed.data.startsOn)
  const endsOn = parseIsoDateStart(parsed.data.endsOn)
  if (endsOn.getTime() < startsOn.getTime()) {
    return hrmActionFailure({
      endsOn: "End date must be on or after start date.",
      form: "End date must be on or after start date.",
    })
  }

  const planLookups = await Promise.all(
    parsed.data.planIds.map((planId) =>
      getBenefitPlanForOrganization(organizationId, planId)
    )
  )
  const hasInvalidPlan = planLookups.some((plan) => !plan || !plan.isActive)
  if (hasInvalidPlan) {
    return hrmActionFailure({
      form: "Open enrollment can only include active benefit plans.",
    })
  }

  const row = await insertBenefitOpenEnrollmentWindow({
    organizationId,
    name: parsed.data.name.trim(),
    startsOn,
    endsOn,
    planIds: parsed.data.planIds,
    createdByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.open_enrollment.create,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_open_enrollment",
      resourceId: row.id,
      metadata: {
        name: parsed.data.name.trim(),
        startsOn: parsed.data.startsOn,
        endsOn: parsed.data.endsOn,
        planCount: parsed.data.planIds?.length ?? 0,
      },
    })
  )

  revalidateBenefits()
  return { ok: true, windowId: row.id }
}

export async function closeBenefitOpenEnrollmentAction(
  _prev: BenefitOpenEnrollmentFormState | undefined,
  formData: FormData
): Promise<BenefitOpenEnrollmentFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = closeBenefitOpenEnrollmentFormSchema.safeParse({
    windowId: formData.get("windowId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
      windowId: parsed.error.flatten().fieldErrors.windowId?.[0],
    })
  }

  const closed = await closeBenefitOpenEnrollmentWindow({
    organizationId,
    windowId: parsed.data.windowId,
    updatedByUserId: userId,
  })
  if (!closed) {
    return hrmActionFailure({ windowId: "Open enrollment window not found." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.open_enrollment.close,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_open_enrollment",
      resourceId: parsed.data.windowId,
      metadata: {},
    })
  )

  revalidateBenefits()
  return { ok: true, windowId: parsed.data.windowId }
}

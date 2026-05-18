"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_BENEFIT_AUDIT } from "../benefit.contract"
import {
  insertBenefitProvider,
  updateBenefitProviderRow,
} from "../data/benefit-provider.mutations.server"
import { getBenefitProviderForOrganization } from "../data/benefit-provider.queries.server"
import { requireHrmAdmin } from "../../../_module-governance/hrm-admin-guard.server"
import {
  createBenefitProviderFormSchema,
  updateBenefitProviderFormSchema,
} from "../schema/benefit.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { BenefitPlanMutationFormState } from "../../../types"

function revalidateBenefits() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/benefits"),
    "layout"
  )
}

function parseCountryCodesFromForm(formData: FormData): string[] {
  const codes = new Set<string>()
  for (const value of formData.getAll("countryCodes")) {
    for (const part of String(value).split(/[,;\n]/)) {
      const normalized = part.trim().toUpperCase()
      if (normalized) {
        codes.add(normalized)
      }
    }
  }
  return [...codes]
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

function hasCheckedValue(formData: FormData, name: string): boolean {
  return formData.getAll(name).some((value) => String(value) === "true")
}

export async function createBenefitProviderAction(
  _prev: BenefitPlanMutationFormState | undefined,
  formData: FormData
): Promise<BenefitPlanMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const countryCodes = parseCountryCodesFromForm(formData)

  const parsed = createBenefitProviderFormSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    countryCodes,
    externalReference: formData.get("externalReference"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const data = parsed.data
  let row: { id: string }
  try {
    row = await insertBenefitProvider({
      organizationId,
      code: data.code.trim(),
      name: data.name.trim(),
      countryCodes: data.countryCodes ?? [],
      externalReference: data.externalReference?.trim() ?? null,
      createdByUserId: userId,
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "A provider with this code already exists.",
      })
    }
    return hrmActionFailure({ form: "Could not create benefit provider." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.provider.create,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_provider",
      resourceId: row.id,
      metadata: { code: data.code.trim() },
    })
  )

  revalidateBenefits()
  return { ok: true, planId: row.id }
}

export async function updateBenefitProviderAction(
  _prev: BenefitPlanMutationFormState | undefined,
  formData: FormData
): Promise<BenefitPlanMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const countryCodes = parseCountryCodesFromForm(formData)

  const parsed = updateBenefitProviderFormSchema.safeParse({
    providerId: formData.get("providerId"),
    code: formData.get("code"),
    name: formData.get("name"),
    countryCodes,
    externalReference: formData.get("externalReference"),
    isActive: hasCheckedValue(formData, "isActive"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const data = parsed.data
  const existing = await getBenefitProviderForOrganization(
    organizationId,
    data.providerId
  )
  if (!existing) {
    return hrmActionFailure({ form: "Benefit provider not found." })
  }

  try {
    await updateBenefitProviderRow({
      organizationId,
      providerId: data.providerId,
      code: data.code.trim(),
      name: data.name.trim(),
      countryCodes: data.countryCodes ?? [],
      externalReference: data.externalReference?.trim() ?? null,
      isActive: data.isActive ?? existing.isActive,
      updatedByUserId: userId,
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "A provider with this code already exists.",
      })
    }
    return hrmActionFailure({ form: "Could not update benefit provider." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_BENEFIT_AUDIT.provider.update,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_provider",
      resourceId: data.providerId,
      metadata: {
        code: data.code.trim(),
        previousCode:
          existing.code !== data.code.trim() ? existing.code : undefined,
      },
    })
  )

  revalidateBenefits()
  return { ok: true, planId: data.providerId }
}

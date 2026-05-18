"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  ORG_APPS_HRM_EMPLOYEE_DETAIL,
  ORG_APPS_HRM_EMPLOYEES,
  ORG_APPS_HRM_ONBOARDING,
} from "#lib/org-apps-module-paths"
import { db } from "#lib/db"
import { hrmEmploymentContract } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { completeOnboardingStepFormSchema } from "../schemas/onboarding.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"
import { requireEmployeeLifecycleMutationGate } from "../data/employee-lifecycle-action-guard.server"
import { HRM_EMPLOYEE_LIFECYCLE_AUDIT } from "../employee-lifecycle.contract"

function revalidateOnboardingSurfaces() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_ONBOARDING),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

type OnboardingChecklistJson = {
  completedSteps?: string[]
}

function parseChecklist(value: unknown): OnboardingChecklistJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  const o = value as Record<string, unknown>
  const steps = o.completedSteps
  if (!Array.isArray(steps)) return {}
  const completedSteps = steps.filter((s): s is string => typeof s === "string")
  return { completedSteps }
}

export async function completeOnboardingStepAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeLifecycleMutationGate(
    formData,
    "update",
    "onboarding"
  )
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = completeOnboardingStepFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    contractId: formData.get("contractId"),
    stepKey: formData.get("stepKey"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.stepKey?.[0] ?? fe.contractId?.[0],
    })
  }

  const { contractId, stepKey } = parsed.data

  const [row] = await db
    .select({
      id: hrmEmploymentContract.id,
      state: hrmEmploymentContract.state,
      onboardingChecklist: hrmEmploymentContract.onboardingChecklist,
    })
    .from(hrmEmploymentContract)
    .where(
      and(
        eq(hrmEmploymentContract.organizationId, organizationId),
        eq(hrmEmploymentContract.id, contractId)
      )
    )
    .limit(1)

  if (!row) {
    return hrmActionFailure({ form: "Contract not found." })
  }
  if (row.state !== "active") {
    return hrmActionFailure({
      form: "Onboarding steps can only be recorded on active contracts.",
    })
  }

  const prior = parseChecklist(row.onboardingChecklist)
  const completed = new Set(prior.completedSteps ?? [])
  if (completed.has(stepKey)) {
    return { ok: true }
  }
  completed.add(stepKey)
  const next: OnboardingChecklistJson = {
    completedSteps: [...completed],
  }

  await db
    .update(hrmEmploymentContract)
    .set({
      onboardingChecklist: next,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(eq(hrmEmploymentContract.id, row.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_LIFECYCLE_AUDIT.onboarding.step_complete,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employment_contract",
      resourceId: contractId,
      metadata: { stepKey },
    })
  )

  revalidateOnboardingSurfaces()
  return { ok: true }
}

"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL,
  ORG_DASHBOARD_HRM_EMPLOYEES,
  ORG_DASHBOARD_HRM_ONBOARDING,
} from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmploymentContract } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmAdmin } from "../../../hrm-admin-guard.server"
import { requireHrmOrgTenantFromForm } from "../../../hrm-action-guard.server"
import { completeOnboardingStepFormSchema } from "../schemas/onboarding.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

function revalidateOnboardingSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_ONBOARDING),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
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
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const admin = await requireHrmAdmin()
  if (!admin.ok) {
    return hrmActionFailure({ form: admin.error })
  }

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
      action: "erp.hrm.onboarding.step.complete",
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

"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { requireEmployeePortalMutationGate } from "../data/employee-portal-mutation-gate.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { portalAcknowledgementFormSchema } from "../schemas/employee-portal-profile.schema"
import { HRM_ESS_AUDIT } from "../ess.contract"
import type { EssAcknowledgementFormState } from "../../../types"

/**
 * Records an employee's acknowledgement of an HR policy or required notice.
 * HRM-ESS-016 — "System shall allow employees to acknowledge policies and required HR notices."
 *
 * The acknowledgement is written as an IAM audit event (no separate table needed).
 * This creates an immutable, auditable record of when and what the employee acknowledged.
 */
export async function acknowledgePortalPolicyAction(
  _prev: EssAcknowledgementFormState | undefined,
  formData: FormData
): Promise<EssAcknowledgementFormState> {
  const gate = await requireEmployeePortalMutationGate(formData)
  if (!gate.ok) {
    return { ok: false, errors: { form: gate.formError } }
  }
  const { context } = gate

  const parsed = portalAcknowledgementFormSchema.safeParse({
    portalSlug: context.portal.portalSlug,
    policyId: formData.get("policyId"),
    policyTitle: formData.get("policyTitle"),
    policyVersion: formData.get("policyVersion") || null,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        policyId: flat.policyId?.[0],
        form: flat.policyTitle?.[0] ?? parsed.error.issues[0]?.message,
      },
    }
  }

  const { organizationId, userId, sessionId } = context.portal
  const employeeId = context.employee.id

  return withEmployeePortalActionSpan(context, "acknowledgement", "submit", async () => {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: HRM_ESS_AUDIT.acknowledgement.submit,
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_employee",
        resourceId: employeeId,
        metadata: {
          surface: "employee_portal",
          policyId: parsed.data.policyId,
          policyTitle: parsed.data.policyTitle,
          policyVersion: parsed.data.policyVersion ?? null,
          employeeId,
        },
      })
    )

    revalidatePath(
      toLocalePortalRevalidatePattern("/employee/documents"),
      "page"
    )

    return { ok: true }
  })
}

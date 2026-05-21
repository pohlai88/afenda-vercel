"use server"

import { requireOrgSession } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { decideTimeClockPunchException } from "../data/tci-exception-commands.server"
import { timeClockExceptionDecisionFormSchema } from "../schemas/tci.schema"

export type TimeClockExceptionDecisionFormState =
  | { ok: true; exceptionId: string; eventId?: string }
  | { ok: false; errors: Record<string, string | undefined> }

export async function decideTimeClockPunchExceptionAction(
  _prev: TimeClockExceptionDecisionFormState | undefined,
  formData: FormData
): Promise<TimeClockExceptionDecisionFormState> {
  const session = await requireOrgSession()
  const gate = await requireHrmPermission({
    object: "time_clock_punch",
    function: "update",
    errorMessage: "Time clock exception decision permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = timeClockExceptionDecisionFormSchema.safeParse({
    exceptionId: formData.get("exceptionId"),
    decision: formData.get("decision"),
    decisionReason: formData.get("decisionReason") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid decision.",
    })
  }

  return decideTimeClockPunchException(
    {
      organizationId: session.organizationId,
      userId: session.userId,
      sessionId: session.sessionId,
    },
    parsed.data
  )
}

"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import {
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"

import { transitionOrgFeedbackEventState } from "../data/feedback.mutations.server"
import { feedbackTransitionFormSchema } from "../schemas/feedback-transition.schema"
import type { TransitionOrgFeedbackState } from "../types"

function auditActionForTransition(
  transition: "acknowledge" | "resolve" | "reject"
): string {
  switch (transition) {
    case "acknowledge":
      return "org.feedback.acknowledge"
    case "resolve":
      return "org.feedback.resolve"
    case "reject":
      return "org.feedback.reject"
    default: {
      const _exhaustive: never = transition
      return _exhaustive
    }
  }
}

export async function transitionOrgFeedbackAction(
  _prev: TransitionOrgFeedbackState,
  formData: FormData
): Promise<TransitionOrgFeedbackState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { status: "error", messageKey: "errorUnauthorized" }
  }
  const session = gate.session

  const parsed = feedbackTransitionFormSchema.safeParse({
    id: formData.get("id"),
    transition: formData.get("transition"),
    resolutionNote: formData.get("resolutionNote"),
  })
  if (!parsed.success) {
    return { status: "validation", messageKey: "errorValidation" }
  }

  const { id, transition, resolutionNote } = parsed.data

  try {
    const result = await transitionOrgFeedbackEventState({
      id,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      transition,
      resolutionNote,
    })

    if (!result.ok) {
      if (result.code === "not_found") {
        return { status: "error", messageKey: "errorNotFound" }
      }
      return { status: "error", messageKey: "errorInvalidTransition" }
    }

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: auditActionForTransition(transition),
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        organizationId: session.organizationId,
        resourceType: "org_feedback_event",
        resourceId: id,
        metadata: {
          transition,
          hasNote: Boolean(resolutionNote),
        },
      })
    )

    revalidatePath(toLocaleOrgAdminRevalidatePattern("/feedback"), "page")
  } catch {
    return { status: "error", messageKey: "errorGeneric" }
  }

  return { status: "success" }
}

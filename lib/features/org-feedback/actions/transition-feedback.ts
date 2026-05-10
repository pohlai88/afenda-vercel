"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

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
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return { status: "error", messageKey: "errorUnauthorized" }
  }

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

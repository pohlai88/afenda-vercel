"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import type { ZodIssue } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { insertOrgFeedbackEvent } from "../data/feedback.mutations.server"
import { feedbackSubmissionSchema } from "../schemas/feedback.schema"
import type {
  SubmitOrgFeedbackFieldErrors,
  SubmitOrgFeedbackState,
} from "../types"

function normalizeFeedbackFormData(formData: FormData) {
  const category = formData.get("category")
  const severityRaw = formData.get("severity")
  const message = formData.get("message")
  const path = formData.get("path")
  const userAgent = formData.get("userAgent")
  const source = formData.get("source")
  const requestKind = formData.get("requestKind")
  const utilityId = formData.get("utilityId")

  return {
    category,
    severity:
      typeof severityRaw === "string" && severityRaw.length > 0
        ? severityRaw
        : "normal",
    message,
    path: typeof path === "string" ? path : undefined,
    userAgent: typeof userAgent === "string" ? userAgent : undefined,
    source: typeof source === "string" ? source : undefined,
    requestKind: typeof requestKind === "string" ? requestKind : undefined,
    utilityId: typeof utilityId === "string" ? utilityId : undefined,
  }
}

function mapValidationIssues(issues: ZodIssue[]): SubmitOrgFeedbackFieldErrors {
  const out: SubmitOrgFeedbackFieldErrors = {}
  for (const issue of issues) {
    const path0 = issue.path[0]
    if (path0 === "message") {
      if (issue.code === "too_small") out.message = "errorMin"
      else if (issue.code === "too_big") out.message = "errorMax"
      else out.message = "errorMin"
    } else if (path0 === "category") {
      out.category = "invalid"
    } else if (path0 === "severity") {
      out.severity = "invalid"
    }
  }
  return out
}

export async function submitOrgFeedbackAction(
  _prev: SubmitOrgFeedbackState,
  formData: FormData
): Promise<SubmitOrgFeedbackState> {
  const { organizationId, userId, sessionId } = await requireOrgSession()

  const raw = normalizeFeedbackFormData(formData)
  const parsed = feedbackSubmissionSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      status: "validation",
      fieldErrors: mapValidationIssues(parsed.error.issues),
    }
  }

  let data = parsed.data
  if (data.category !== "bug") {
    data = { ...data, severity: "normal" }
  }

  const pathForRow = data.path ?? null
  const uaForRow = data.userAgent ?? null
  const metadata = {
    messageLength: data.message.length,
    ...(data.source ? { source: data.source } : {}),
    ...(data.requestKind ? { requestKind: data.requestKind } : {}),
    ...(data.utilityId ? { utilityId: data.utilityId } : {}),
  }

  try {
    const id = await insertOrgFeedbackEvent({
      organizationId,
      actorUserId: userId,
      category: data.category,
      severity: data.severity,
      message: data.message,
      path: pathForRow,
      userAgent: uaForRow,
      metadata: JSON.stringify(metadata),
    })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: "org.feedback.submit",
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "org_feedback_event",
        resourceId: id,
        path: pathForRow,
        metadata: {
          category: data.category,
          severity: data.severity,
          ...(data.source ? { source: data.source } : {}),
          ...(data.requestKind ? { requestKind: data.requestKind } : {}),
          ...(data.utilityId ? { utilityId: data.utilityId } : {}),
        },
      })
    )

    revalidatePath(toLocaleOrgAdminRevalidatePattern("/feedback"), "page")
  } catch {
    return { status: "error", messageKey: "errorGeneric" }
  }

  return { status: "success" }
}

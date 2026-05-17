"use server"

import { headers } from "next/headers"

import {
  type ActionResponse,
  type PageFeedback,
  pageFeedback,
} from "#components2/feedback/schema"
import { auth, writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { askDocsFeedback } from "#lib/db/schema"
import {
  DEFAULT_APP_LOCALE,
  stripLeadingLocalePrefix,
} from "#lib/i18n/locales.shared"
import { logUnexpectedServerError } from "#lib/logger.server"

function ratingFromOpinion(opinion: PageFeedback["opinion"]): -1 | 1 {
  return opinion === "good" ? 1 : -1
}

/**
 * Server Action for ask-docs page-level feedback.
 * Persists a row and writes an IAM audit event (no PII in audit metadata).
 */
export async function submitAskDocsFeedback(
  feedback: PageFeedback
): Promise<ActionResponse> {
  const parsedFeedback = pageFeedback.safeParse(feedback)
  if (!parsedFeedback.success) {
    return {}
  }

  const validFeedback = parsedFeedback.data

  try {
    const headerList = await headers()
    const userAgent = headerList.get("user-agent")

    let locale = DEFAULT_APP_LOCALE
    let pagePath = validFeedback.url
    try {
      const parsed = new URL(validFeedback.url)
      const stripped = stripLeadingLocalePrefix(parsed.pathname)
      if (stripped) {
        locale = stripped.locale
        pagePath = stripped.pathnameWithoutLocale
      } else {
        pagePath = parsed.pathname
      }
    } catch {
      // Keep defaults when url is not a valid absolute URL.
    }

    let userId: string | null = null
    let orgId: string | null = null
    let sessionId: string | null = null

    try {
      const { data } = await auth.getSession({
        fetchOptions: { headers: headerList },
      })
      userId = data?.user?.id ?? null
      orgId = data?.session?.activeOrganizationId ?? null
      sessionId = data?.session?.id ?? null
    } catch {
      // Public docs — session is optional.
    }

    const [inserted] = await db
      .insert(askDocsFeedback)
      .values({
        locale,
        pagePath,
        rating: ratingFromOpinion(validFeedback.opinion),
        message: validFeedback.message.trim() || null,
        source: "ask-docs",
        userAgent,
        userId,
        orgId,
        sessionId,
      })
      .returning({ id: askDocsFeedback.id })

    await writeIamAuditEventFromNextHeaders({
      action: "iam.docs.feedback.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId: orgId,
      resourceType: "ask_docs_feedback",
      resourceId: inserted?.id ?? null,
      path: pagePath,
      metadata: {
        locale,
        pagePath,
        rating: ratingFromOpinion(validFeedback.opinion),
        source: "ask-docs",
      },
    })

    return {}
  } catch (err) {
    logUnexpectedServerError("submitAskDocsFeedback failed", err)
    return {}
  }
}

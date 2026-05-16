"use server"

import type { ActionResponse, PageFeedback } from "#components/feedback/schema"
import { logUnexpectedServerError, rootLogger } from "#lib/logger.server"

/**
 * Server Action for help-docs page-level feedback.
 *
 * Out of the box this logs feedback submissions via the structured Pino logger.
 * To forward submissions to GitHub Discussion, PostHog, or another service,
 * follow the integration guide at https://www.fumadocs.dev/docs/integrations/feedback
 * and replace the body of this function.
 *
 * To enable GitHub Discussion reporting, set these env vars and wire in
 * the `lib/github.ts` starter from the Fumadocs feedback docs:
 *   GITHUB_APP_ID
 *   GITHUB_APP_PRIVATE_KEY
 */
export async function submitHelpDocsFeedback(
  feedback: PageFeedback
): Promise<ActionResponse> {
  try {
    rootLogger.info(
      {
        opinion: feedback.opinion,
        hasMessage: feedback.message.length > 0,
      },
      "help-docs feedback received"
    )
    return {}
  } catch (err) {
    logUnexpectedServerError("submitHelpDocsFeedback failed", err)
    return {}
  }
}

/**
 * Client-safe barrel — Server Action binding + shared constants/types.
 * Do not import the module `index.ts` from Client Components (may pull RSC graph).
 */
export {
  FEEDBACK_CATEGORIES,
  FEEDBACK_INBOX_PAGE_SIZE,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_RESOLUTION_NOTE_MAX,
  FEEDBACK_SEVERITIES,
  FEEDBACK_STATES,
} from "./constants"
export type {
  FeedbackCategoryId,
  FeedbackSeverityId,
  FeedbackStateId,
} from "./constants"
export type {
  SubmitOrgFeedbackFieldErrors,
  SubmitOrgFeedbackState,
  TransitionOrgFeedbackState,
} from "./types"
export { submitOrgFeedbackAction } from "./actions/submit-feedback"
export { transitionOrgFeedbackAction } from "./actions/transition-feedback"

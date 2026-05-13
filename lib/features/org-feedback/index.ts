/**
 * Org-scoped operator feedback (L1 utility bar) + admin inbox lifecycle.
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
export { feedbackSubmissionSchema } from "./schemas/feedback.schema"
export type { FeedbackSubmissionInput } from "./schemas/feedback.schema"
export {
  loadOrgFeedbackInboxSearchParams,
  serializeOrgFeedbackInboxSearchParams,
  type OrgFeedbackInboxSearchParamsLoaded,
} from "./schemas/org-feedback-inbox.search-params"
export {
  FEEDBACK_TRANSITION_TO_STATE,
  feedbackTransitionFormSchema,
} from "./schemas/feedback-transition.schema"
export type { FeedbackTransitionFormInput } from "./schemas/feedback-transition.schema"
export type {
  OrgFeedbackEventSummary,
  OrgFeedbackListResult,
  OrgFeedbackListStateFilter,
  SubmitOrgFeedbackFieldErrors,
  SubmitOrgFeedbackState,
  TransitionOrgFeedbackState,
} from "./types"
export { submitOrgFeedbackAction } from "./actions/submit-feedback"
export { transitionOrgFeedbackAction } from "./actions/transition-feedback"

export { OrgFeedbackList } from "./components/feedback-list"

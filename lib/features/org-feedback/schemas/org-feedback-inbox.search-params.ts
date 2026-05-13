import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs/server"

import { FEEDBACK_STATES } from "../constants"

const ORG_FEEDBACK_INBOX_STATE_VALUES = ["all", ...FEEDBACK_STATES] as const

export const orgFeedbackInboxSearchParams = {
  page: parseAsInteger.withDefault(1),
  state: parseAsStringLiteral(ORG_FEEDBACK_INBOX_STATE_VALUES).withDefault("all"),
}

export const loadOrgFeedbackInboxSearchParams = createLoader(
  orgFeedbackInboxSearchParams
)

export const serializeOrgFeedbackInboxSearchParams = createSerializer(
  orgFeedbackInboxSearchParams
)

export type OrgFeedbackInboxSearchParamsLoaded = Awaited<
  ReturnType<typeof loadOrgFeedbackInboxSearchParams>
>

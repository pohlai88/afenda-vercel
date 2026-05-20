import "server-only"

export {
  fwaEligibilityRuleMatchesFacts as otmEligibilityRuleMatchesFacts,
  resolveFwaEligibilityEmployeeFacts as resolveOtmEligibilityEmployeeFacts,
} from "../../flexible-work-arrangement-tracking/data/fwa-eligibility-facts.server"

export type { FwaEligibilityEmployeeFacts as OtmEligibilityEmployeeFacts } from "../../flexible-work-arrangement-tracking/data/fwa-eligibility-facts.server"

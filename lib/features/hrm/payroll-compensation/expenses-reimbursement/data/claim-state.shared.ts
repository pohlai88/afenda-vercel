import type { ClaimStateValue } from "./claim-helpers.shared"

export const CLAIM_DISPLAY_STATES = [
  "draft",
  "submitted",
  "returned",
  "approved",
  "rejected",
  "cancelled",
  "paid",
] as const

export type ClaimDisplayState = (typeof CLAIM_DISPLAY_STATES)[number]

/** UI label when claim is submitted and approval is pending. */
export function resolveClaimDisplayState(input: {
  readonly state: ClaimStateValue | string
  readonly hasPendingApproval: boolean
}): ClaimDisplayState | "under_review" {
  if (input.state === "submitted" && input.hasPendingApproval) {
    return "under_review"
  }
  if (input.state === "submitted") return "submitted"
  if (
    input.state === "draft" ||
    input.state === "returned" ||
    input.state === "approved" ||
    input.state === "rejected" ||
    input.state === "cancelled" ||
    input.state === "paid"
  ) {
    return input.state
  }
  return "submitted"
}

export function canTransitionClaimTo(
  from: ClaimStateValue | string,
  to: ClaimStateValue | string
): boolean {
  if (from === to) return true
  if (from === "draft" && to === "submitted") return true
  if (from === "submitted" && (to === "approved" || to === "rejected" || to === "returned" || to === "cancelled")) {
    return true
  }
  if (from === "returned" && (to === "submitted" || to === "cancelled")) return true
  if (from === "approved" && (to === "paid" || to === "cancelled")) return true
  return false
}

export function isClaimResubmittable(state: string): boolean {
  return state === "returned" || state === "draft"
}

import {
  addBenefitDays,
  toBenefitUtcDay,
  type BenefitDateInput,
} from "./benefit-calendar.shared"
import type { BenefitEligibilityResult } from "./benefit-eligibility.shared"
import type { BenefitLifeEventVerificationStatus } from "./benefit-helpers.shared"

export type BenefitEnrollmentWindowKind = "open_enrollment" | "life_event"

export type BenefitEnrollmentWindow = {
  readonly id: string
  readonly kind: BenefitEnrollmentWindowKind
  readonly opensAt: BenefitDateInput
  readonly closesAt: BenefitDateInput
  readonly planIds?: readonly string[]
  readonly lifeEventId?: string | null
  readonly lifeEventVerificationStatus?: BenefitLifeEventVerificationStatus | null
}

export type BenefitElectionAccessReasonCode =
  | "window_closed"
  | "plan_not_in_window"
  | "life_event_not_verified"
  | "eligibility_blocked"

export type BenefitElectionAccessReason = {
  readonly code: BenefitElectionAccessReasonCode
  readonly message: string
}

export type BenefitElectionAccessResult = {
  readonly allowed: boolean
  readonly reasons: readonly BenefitElectionAccessReason[]
}

function accessReason(
  code: BenefitElectionAccessReasonCode,
  message: string
): BenefitElectionAccessReason {
  return { code, message }
}

export function isBenefitEnrollmentWindowOpen(
  window: BenefitEnrollmentWindow,
  at: BenefitDateInput
): boolean {
  const day = toBenefitUtcDay(at, "at")
  return (
    toBenefitUtcDay(window.opensAt, "window.opensAt") <= day &&
    day <= toBenefitUtcDay(window.closesAt, "window.closesAt")
  )
}

export function buildLifeEventEnrollmentWindow(params: {
  readonly lifeEventId: string
  readonly eventDate: BenefitDateInput
  readonly verificationStatus: BenefitLifeEventVerificationStatus
  readonly daysAfterEvent?: number
}): BenefitEnrollmentWindow {
  const daysAfterEvent = params.daysAfterEvent ?? 30
  if (!Number.isInteger(daysAfterEvent) || daysAfterEvent < 0) {
    throw new Error("Life-event enrollment window must be a positive day count")
  }

  return {
    id: `life-event:${params.lifeEventId}`,
    kind: "life_event",
    opensAt: params.eventDate,
    closesAt: addBenefitDays(params.eventDate, daysAfterEvent),
    lifeEventId: params.lifeEventId,
    lifeEventVerificationStatus: params.verificationStatus,
  }
}

export function resolveBenefitElectionAccess(params: {
  readonly window: BenefitEnrollmentWindow
  readonly planId: string
  readonly at: BenefitDateInput
  readonly eligibility: BenefitEligibilityResult
}): BenefitElectionAccessResult {
  const reasons: BenefitElectionAccessReason[] = []

  if (!isBenefitEnrollmentWindowOpen(params.window, params.at)) {
    reasons.push(accessReason("window_closed", "Enrollment window is closed."))
  }

  if (
    params.window.planIds &&
    params.window.planIds.length > 0 &&
    !params.window.planIds.includes(params.planId)
  ) {
    reasons.push(
      accessReason("plan_not_in_window", "Benefit plan is not in this window.")
    )
  }

  if (
    params.window.kind === "life_event" &&
    params.window.lifeEventVerificationStatus !== "verified"
  ) {
    reasons.push(
      accessReason(
        "life_event_not_verified",
        "Life event must be verified before election changes."
      )
    )
  }

  if (!params.eligibility.eligible) {
    reasons.push(
      accessReason("eligibility_blocked", "Employee is not eligible.")
    )
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  }
}

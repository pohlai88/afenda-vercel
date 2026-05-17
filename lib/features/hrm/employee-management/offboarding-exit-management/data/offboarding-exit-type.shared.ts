/** HRM-OFF-002 — supported exit initiation types. */
export const HRM_OFFBOARDING_EXIT_TYPES = [
  "resignation",
  "termination",
  "retirement",
  "contract_expiry",
  "redundancy",
  "death",
  "mutual_separation",
] as const

export type HrmOffboardingExitType = (typeof HRM_OFFBOARDING_EXIT_TYPES)[number]

const EXIT_TYPE_SET: ReadonlySet<string> = new Set(HRM_OFFBOARDING_EXIT_TYPES)

export function isHrmOffboardingExitType(
  value: string | null | undefined
): value is HrmOffboardingExitType {
  return typeof value === "string" && EXIT_TYPE_SET.has(value)
}

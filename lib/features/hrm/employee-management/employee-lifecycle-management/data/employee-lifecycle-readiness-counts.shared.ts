import type { EMPLOYEE_LIFECYCLE_READINESS_COUNTERS } from "./employee-lifecycle-surface-metadata.shared"

export type EmployeeLifecycleReadinessCounterKey =
  (typeof EMPLOYEE_LIFECYCLE_READINESS_COUNTERS)[number]["key"]

export type EmployeeLifecycleReadinessCounts = Record<
  EmployeeLifecycleReadinessCounterKey,
  number
>

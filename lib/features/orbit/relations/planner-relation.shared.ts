import type { PlannerRelationType } from "../constants"

export function inversePlannerRelation(
  relation: PlannerRelationType
): PlannerRelationType {
  if (relation === "parent") return "subtask"
  if (relation === "subtask") return "parent"
  if (relation === "blocks") return "blocked_by"
  if (relation === "blocked_by") return "blocks"
  return relation
}

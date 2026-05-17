import type {
  BoardingStatus,
  BoardingTaskStatus,
} from "../schemas/boarding.schema"

export type BoardingTaskStatusInput = {
  readonly required: boolean
  readonly status: BoardingTaskStatus | string
}

export function requiredBoardingTasksSatisfied(
  tasks: readonly BoardingTaskStatusInput[]
): boolean {
  return tasks
    .filter((task) => task.required)
    .every((task) => task.status === "completed" || task.status === "waived")
}

export function deriveBoardingInstanceStatus(
  tasks: readonly BoardingTaskStatusInput[]
): BoardingStatus {
  if (tasks.length === 0) {
    return "pending"
  }
  if (requiredBoardingTasksSatisfied(tasks)) {
    return "completed"
  }
  if (tasks.some((task) => task.status === "blocked")) {
    return "blocked"
  }
  if (
    tasks.some(
      (task) =>
        task.status === "in_progress" ||
        task.status === "completed" ||
        task.status === "waived"
    )
  ) {
    return "in_progress"
  }
  return "pending"
}

export function isOpenBoardingStatus(status: string): boolean {
  return (
    status === "pending" || status === "in_progress" || status === "blocked"
  )
}

export type CareerPathFrameworkRow = {
  id: string
  code: string
  name: string
  description: string | null
  pathKind: string
  status: string
  stageCount: number
}

export type TargetRoleRow = {
  id: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  targetRoleTitle: string
  source: string
  isPrimary: boolean
  frameworkName: string | null
}

export type DevelopmentPlanRow = {
  id: string
  employeeId: string
  employeeName: string
  title: string
  status: string
  goalCount: number
  overdueMilestoneCount: number
}

export type DevelopmentGoalRow = {
  id: string
  planId: string
  title: string
  goalType: string
  status: string
  targetDate: Date | null
  milestoneCount: number
}

export type CareerGapRow = {
  skillName: string
  currentLevel: string
  targetLevel: string
  gap: string
}

export type ReadinessRow = {
  employeeId: string
  employeeName: string
  targetRoleTitle: string | null
  readinessLevel: string
  progressPercent: number
}

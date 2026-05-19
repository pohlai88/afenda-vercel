export const AAT_LIST_SURFACE_IDS = {
  departmentRanking: "hrm:aat:department-ranking",
  highRiskEmployees: "hrm:aat:high-risk-employees",
  exceptionTrends: "hrm:aat:exception-trends",
  leaveTypeBreakdown: "hrm:aat:leave-type-breakdown",
} as const

export type AatListSurfaceId =
  (typeof AAT_LIST_SURFACE_IDS)[keyof typeof AAT_LIST_SURFACE_IDS]

export const AAT_STAT_SURFACE_KEY = "hrm:aat:kpi-summary" as const
export const AAT_CHART_SURFACE_KEY = "hrm:aat:absence-trend" as const
export const AAT_HEATMAP_SURFACE_KEY = "hrm:aat:daily-heatmap" as const

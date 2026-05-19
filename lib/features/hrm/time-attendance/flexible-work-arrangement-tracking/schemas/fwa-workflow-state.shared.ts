import { z } from "zod"

export const HRM_FWA_ARRANGEMENT_KINDS = [
  "hybrid",
  "remote",
  "compressed",
  "flexible_hours",
  "staggered",
  "part_time",
  "temporary",
] as const

export type HrmFwaArrangementKind = (typeof HRM_FWA_ARRANGEMENT_KINDS)[number]

export const hrmFwaArrangementKindSchema = z.enum(HRM_FWA_ARRANGEMENT_KINDS)

export const HRM_FWA_REQUEST_STATES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "returned",
  "active",
  "suspended",
  "terminated",
  "expired",
] as const

export type HrmFwaRequestState = (typeof HRM_FWA_REQUEST_STATES)[number]

export const hrmFwaRequestStateSchema = z.enum(HRM_FWA_REQUEST_STATES)

export const HRM_FWA_WORK_MODES = ["office", "remote", "rest"] as const

export type HrmFwaWorkMode = (typeof HRM_FWA_WORK_MODES)[number]

export const hrmFwaWorkModeSchema = z.enum(HRM_FWA_WORK_MODES)

export const HRM_FWA_INITIATED_BY = ["employee", "manager", "hr"] as const

export type HrmFwaInitiatedBy = (typeof HRM_FWA_INITIATED_BY)[number]

export const hrmFwaInitiatedBySchema = z.enum(HRM_FWA_INITIATED_BY)

import { z } from "zod"

export const PORTAL_AUDIENCES = [
  "employee",
  "supplier",
  "customer",
  "investor",
] as const

export const portalAudienceSchema = z.enum(PORTAL_AUDIENCES)

export type PortalAudience = z.infer<typeof portalAudienceSchema>

export const PORTAL_STATUSES = ["active", "inactive"] as const

export const portalStatusSchema = z.enum(PORTAL_STATUSES)

export type PortalStatus = z.infer<typeof portalStatusSchema>

export const PORTAL_ACCESS_STATUSES = ["active", "revoked"] as const

export const portalAccessStatusSchema = z.enum(PORTAL_ACCESS_STATUSES)

export type PortalAccessStatus = z.infer<typeof portalAccessStatusSchema>

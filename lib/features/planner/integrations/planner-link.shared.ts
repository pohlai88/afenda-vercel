import { z } from "zod"

export const plannerLinkShapeSchema = z.object({
  module: z.string().trim().min(1).max(64),
  entityType: z.string().trim().min(1).max(128),
  entityId: z.string().trim().min(1).max(256),
  displayLabel: z.string().trim().min(1).max(256),
  href: z.string().trim().max(1024).nullable().optional(),
  causalityReason: z.string().trim().min(1).max(2000),
})

import { z } from "zod"

export const orgNotificationSeveritySchema = z.enum([
  "info",
  "warning",
  "critical",
])

export const createOrgNotificationSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(4000),
    severity: orgNotificationSeveritySchema.default("info"),
    expiresAt: z.string().datetime().optional().nullable(),
    targetUserId: z.string().trim().max(255).optional().nullable(),
    linkedEntityType: z.string().trim().max(80).optional().nullable(),
    linkedEntityId: z.string().trim().max(200).optional().nullable(),
    linkedEntityLabel: z.string().trim().max(200).optional().nullable(),
    linkedPath: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const hasLinkedLabel = Boolean(
      value.linkedEntityLabel && value.linkedEntityLabel.trim().length > 0
    )
    const hasLinkedPath = Boolean(
      value.linkedPath && value.linkedPath.trim().length > 0
    )

    if (hasLinkedLabel !== hasLinkedPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLinkedLabel ? ["linkedPath"] : ["linkedEntityLabel"],
        message: "Linked label and linked path must be provided together",
      })
    }

    if (value.expiresAt) {
      const expiresAt = new Date(value.expiresAt)
      if (
        Number.isNaN(expiresAt.getTime()) ||
        expiresAt.getTime() <= Date.now()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiresAt"],
          message: "Expiry must be in the future",
        })
      }
    }
  })

export const orgPushSubscriptionBodySchema = z.object({
  endpoint: z.string().trim().min(1).max(2000),
  keys: z.object({
    p256dh: z.string().trim().min(1).max(500),
    auth: z.string().trim().min(1).max(500),
  }),
})

export const orgPushUnsubscribeBodySchema = z.object({
  endpoint: z.string().trim().min(1).max(2000).optional(),
})

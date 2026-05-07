import { z } from "zod"

import { ORG_ADMIN_EVENT_NAMESPACES, isAllowedEventType } from "../constants"

/**
 * Validates a single namespaced event type. The string must:
 *   1. start with one of {@link ORG_ADMIN_EVENT_NAMESPACES} followed by `.`
 *   2. be a member of the canonical `ORG_EVENT_TYPES` allowlist
 *
 * Step (1) is the structural gate (also used at audit-write time); step (2)
 * keeps the public delivery surface small and reviewed.
 */
export const eventTypeSchema = z
  .string()
  .min(1, "Event type required")
  .max(96, "Event type too long")
  .refine((value) => {
    const dot = value.indexOf(".")
    if (dot <= 0) return false
    const prefix = value.slice(
      0,
      dot
    ) as (typeof ORG_ADMIN_EVENT_NAMESPACES)[number]
    return (ORG_ADMIN_EVENT_NAMESPACES as readonly string[]).includes(prefix)
  }, "Event type prefix is not in the canonical taxonomy")
  .refine(isAllowedEventType, "Event type is not in the canonical allowlist")

/** A non-empty unique array of subscribed event types. */
export const subscribedEventsSchema = z
  .array(eventTypeSchema)
  .min(1, "Pick at least one event type")
  .max(64, "Too many subscriptions")
  .refine(
    (values) => new Set(values).size === values.length,
    "Duplicate event types are not allowed"
  )

export type SubscribedEvents = z.infer<typeof subscribedEventsSchema>

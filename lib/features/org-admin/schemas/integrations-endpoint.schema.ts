import { z } from "zod"

import { subscribedEventsSchema } from "./integrations-event-type.schema"

/**
 * URL validator for outbound delivery endpoints. Production builds enforce
 * HTTPS; non-production allows `http://` to ease local mock receivers.
 */
const endpointUrlSchema = z
  .string()
  .url("Endpoint URL must be a valid absolute URL")
  .max(2048, "Endpoint URL too long")
  .refine((raw) => {
    try {
      const u = new URL(raw)
      if (process.env.NODE_ENV === "production") {
        return u.protocol === "https:"
      }
      return u.protocol === "https:" || u.protocol === "http:"
    } catch {
      return false
    }
  }, "Endpoint URL must be HTTPS in production")

const endpointNameSchema = z
  .string()
  .trim()
  .min(2, "Name is too short")
  .max(80, "Name is too long")

/**
 * Server-side validator for `createOrgEventEndpoint` / `updateOrgEventEndpoint`
 * Server Action input. Accepts FormData-shaped values plus the parsed events
 * array (clients send it as a comma-separated string in `formData`).
 */
export const orgEventEndpointInputSchema = z.object({
  name: endpointNameSchema,
  url: endpointUrlSchema,
  events: subscribedEventsSchema,
  enabled: z.boolean().default(true),
})

export type OrgEventEndpointInput = z.infer<typeof orgEventEndpointInputSchema>

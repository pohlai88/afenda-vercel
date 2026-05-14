import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const SCHEMA_STABILITY: SchemaStability = "experimental"

/** Canonical form lifecycle events (UIMF-style vocabulary; handlers reference these by id). */
export const FORM_EVENTS = {
  formLoaded: "form:loaded",
  formPosting: "form:posting",
  responseReceived: "form:responseReceived",
  responseHandled: "form:responseHandled",
} as const

export type FormEventId = (typeof FORM_EVENTS)[keyof typeof FORM_EVENTS]

export const formEventIdSchema = z.enum([
  FORM_EVENTS.formLoaded,
  FORM_EVENTS.formPosting,
  FORM_EVENTS.responseReceived,
  FORM_EVENTS.responseHandled,
])

export const eventHandlerMetadataSchema = z
  .object({
    id: z.string().min(1),
    runAt: formEventIdSchema,
  })
  .strict()

export type EventHandlerMetadata = z.infer<typeof eventHandlerMetadataSchema>

export function parseEventHandlerMetadata(raw: unknown) {
  return eventHandlerMetadataSchema.safeParse(raw)
}

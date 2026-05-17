import { z } from "zod"

const trimmedNonEmpty = z.string().trim().min(1).max(500)
const optionalTrimmed = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(500).optional()
)
const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(320).email().optional()
)
const optionalBoolean = z
  .preprocess(
    (v) => v === "on" || v === true || v === "true" || v === "1",
    z.boolean()
  )
  .default(false)

export const HRM_EMERGENCY_CONTACT_RELATIONSHIPS = [
  "spouse",
  "parent",
  "sibling",
  "child",
  "partner",
  "friend",
  "other",
] as const

export type HrmEmergencyContactRelationship =
  (typeof HRM_EMERGENCY_CONTACT_RELATIONSHIPS)[number]

export const upsertEmergencyContactFormSchema = z.object({
  employeeId: z.string().uuid(),
  /** Present when updating an existing contact; absent when creating. */
  contactId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().uuid().optional()
  ),
  legalName: trimmedNonEmpty,
  relationship: z.enum(HRM_EMERGENCY_CONTACT_RELATIONSHIPS),
  phone: trimmedNonEmpty.max(64),
  alternatePhone: optionalTrimmed,
  email: optionalEmail,
  isPrimary: optionalBoolean,
})

export const archiveEmergencyContactFormSchema = z.object({
  employeeId: z.string().uuid(),
  contactId: z.string().uuid(),
})

export type UpsertEmergencyContactFormInput = z.infer<
  typeof upsertEmergencyContactFormSchema
>
export type ArchiveEmergencyContactFormInput = z.infer<
  typeof archiveEmergencyContactFormSchema
>

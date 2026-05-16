import { z } from "zod"

const optionalTrimmed = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(500).optional()
)

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(320).email().optional()
)

const optionalIsoDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
)

const optionalCountry = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((v) => v.toUpperCase())
    .optional()
)

export const portalPersonalProfileFormSchema = z.object({
  portalSlug: z.string().min(1),
  preferredName: optionalTrimmed,
  dateOfBirth: optionalIsoDate,
  gender: optionalTrimmed,
  nationality: optionalCountry,
  maritalStatus: optionalTrimmed,
})

export const portalEmergencyContactFormSchema = z.object({
  portalSlug: z.string().min(1),
  personalEmail: optionalEmail,
  personalPhone: optionalTrimmed,
  addressLine1: optionalTrimmed,
  addressLine2: optionalTrimmed,
  city: optionalTrimmed,
  region: optionalTrimmed,
  postalCode: optionalTrimmed,
  countryCode: optionalCountry,
})

export const portalBankingProfileFormSchema = z.object({
  portalSlug: z.string().min(1),
  bankCode: optionalTrimmed,
  bankAccountHolderName: optionalTrimmed,
  bankAccountTokenized: optionalTrimmed,
})

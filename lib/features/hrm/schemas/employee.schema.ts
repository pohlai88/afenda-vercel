import { z } from "zod"

const trimmedNonEmpty = z.string().trim().min(1)
const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const optionalTrimmed = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(500).optional()
)

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(320).email().optional()
)

const optionalUuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().uuid().optional()
)

const optionalIsoDateOnly = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  isoDateOnly.optional()
)

const optionalShortCode = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((v) => v.toUpperCase())
    .optional()
)

const optionalBoolean = z
  .preprocess(
    (v) => v === "on" || v === true || v === "true" || v === "1",
    z.boolean()
  )
  .default(false)

const optionalIdentifier = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(128).optional()
)

export const createEmployeeFormSchema = z.object({
  employeeNumber: trimmedNonEmpty.max(64),
  legalName: trimmedNonEmpty.max(500),
  preferredName: optionalTrimmed,
  email: optionalEmail,
  currentDepartmentId: optionalUuid,
  currentPositionId: optionalUuid,
  currentJobGradeId: optionalUuid,
})

export const updateEmployeeFormSchema = createEmployeeFormSchema.extend({
  employeeId: z.string().uuid(),
})

export const archiveEmployeeFormSchema = z.object({
  employeeId: z.string().uuid(),
  archivedReason: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(2000).optional()
  ),
})

export const employeeIdentityFormSchema = z.object({
  employeeId: z.string().uuid(),
  employeeNumber: trimmedNonEmpty.max(64),
  legalName: trimmedNonEmpty.max(500),
  preferredName: optionalTrimmed,
  dateOfBirth: optionalIsoDateOnly,
  gender: optionalTrimmed,
  nationality: optionalShortCode,
  maritalStatus: optionalTrimmed,
})

export const employeeContactFormSchema = z.object({
  employeeId: z.string().uuid(),
  workEmail: optionalEmail,
  workPhone: optionalTrimmed,
  personalEmail: optionalEmail,
  personalPhone: optionalTrimmed,
  addressLine1: optionalTrimmed,
  addressLine2: optionalTrimmed,
  city: optionalTrimmed,
  region: optionalTrimmed,
  postalCode: optionalTrimmed,
  countryCode: optionalShortCode,
})

export const employeeEmploymentFormSchema = z.object({
  employeeId: z.string().uuid(),
  employmentStatus: z
    .enum(["active", "probation", "confirmed", "suspended", "terminated"])
    .default("active"),
  employmentStartDate: optionalIsoDateOnly,
  probationEndDate: optionalIsoDateOnly,
  confirmationDate: optionalIsoDateOnly,
  currentDepartmentId: optionalUuid,
  currentPositionId: optionalUuid,
  currentJobGradeId: optionalUuid,
  managerEmployeeId: optionalUuid,
  linkedUserId: optionalTrimmed,
  countryCode: optionalShortCode,
  workStateCode: optionalTrimmed,
})

export const employeeIdentityDocumentFormSchema = z.object({
  employeeId: z.string().uuid(),
  documentId: optionalUuid,
  documentType: trimmedNonEmpty.max(64),
  documentNumber: trimmedNonEmpty.max(128),
  issuingCountry: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((v) => v.toUpperCase()),
  issuedAt: optionalIsoDateOnly,
  expiresAt: optionalIsoDateOnly,
  isPrimary: optionalBoolean,
  verificationStatus: z
    .enum(["unverified", "verified", "rejected", "expired"])
    .default("unverified"),
})

export const employeeWorkAuthorizationFormSchema = z.object({
  employeeId: z.string().uuid(),
  authorizationId: optionalUuid,
  countryCode: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((v) => v.toUpperCase()),
  authorizationType: trimmedNonEmpty.max(64),
  documentNumber: optionalIdentifier,
  issuedAt: optionalIsoDateOnly,
  expiresAt: optionalIsoDateOnly,
  status: z.enum(["active", "pending", "expired", "revoked"]).default("active"),
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(2000).optional()
  ),
})

export const malaysiaEmployeeStatutoryProfileSchema = z.strictObject({
  employeeId: z.string().uuid(),
  effectiveFrom: isoDateOnly,
  countryCode: z.literal("MY"),
  taxResidencyCountry: z.literal("MY").default("MY"),
  taxIdentifierType: z.literal("my_income_tax").default("my_income_tax"),
  taxIdentifierNumber: optionalIdentifier,
  epfNumber: optionalIdentifier,
  socsoNumber: optionalIdentifier,
  eisEligible: optionalBoolean,
  pcbCategory: optionalTrimmed,
  hrdfApplicable: optionalBoolean,
  workStateCode: optionalTrimmed,
  pcbTp1AdditionalReliefMonthlyMyr: z.preprocess(
    (raw) => {
      if (raw === null || raw === undefined) return undefined
      const value = String(raw).trim()
      return value === "" ? undefined : value
    },
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .max(20)
      .optional()
  ),
  pcbTp3AdditionalDeductionMonthlyMyr: z.preprocess(
    (raw) => {
      if (raw === null || raw === undefined) return undefined
      const value = String(raw).trim()
      return value === "" ? undefined : value
    },
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .max(20)
      .optional()
  ),
})

export const vietnamEmployeeStatutoryProfileSchema = z.strictObject({
  employeeId: z.string().uuid(),
  effectiveFrom: isoDateOnly,
  countryCode: z.literal("VN"),
  taxResidencyCountry: z.literal("VN").default("VN"),
  taxIdentifierType: z.literal("vn_pit").default("vn_pit"),
  taxIdentifierNumber: optionalIdentifier,
  socialInsuranceNumber: optionalIdentifier,
  healthInsuranceNumber: optionalIdentifier,
  unemploymentInsuranceNumber: optionalIdentifier,
  unionEligible: optionalBoolean,
  workProvinceCode: optionalTrimmed,
  workRegionCode: optionalTrimmed,
})

export const employeeStatutoryProfileFormSchema = z.discriminatedUnion(
  "countryCode",
  [
    malaysiaEmployeeStatutoryProfileSchema,
    vietnamEmployeeStatutoryProfileSchema,
  ]
)

export type CreateEmployeeFormInput = z.infer<typeof createEmployeeFormSchema>
export type UpdateEmployeeFormInput = z.infer<typeof updateEmployeeFormSchema>
export type ArchiveEmployeeFormInput = z.infer<typeof archiveEmployeeFormSchema>
export type EmployeeIdentityFormInput = z.infer<
  typeof employeeIdentityFormSchema
>
export type EmployeeContactFormInput = z.infer<typeof employeeContactFormSchema>
export type EmployeeEmploymentFormInput = z.infer<
  typeof employeeEmploymentFormSchema
>
export type EmployeeIdentityDocumentFormInput = z.infer<
  typeof employeeIdentityDocumentFormSchema
>
export type EmployeeWorkAuthorizationFormInput = z.infer<
  typeof employeeWorkAuthorizationFormSchema
>
export type MalaysiaEmployeeStatutoryProfileInput = z.infer<
  typeof malaysiaEmployeeStatutoryProfileSchema
>
export type VietnamEmployeeStatutoryProfileInput = z.infer<
  typeof vietnamEmployeeStatutoryProfileSchema
>
export type EmployeeStatutoryProfileFormInput = z.infer<
  typeof employeeStatutoryProfileFormSchema
>

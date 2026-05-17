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

export const createEmployeeFormSchema = z
  .object({
    employeeNumber: trimmedNonEmpty.max(64),
    legalName: trimmedNonEmpty.max(500),
    preferredName: optionalTrimmed,
    email: optionalEmail,
    phone: optionalTrimmed,
    employmentStartDate: optionalIsoDateOnly,
    currentDepartmentId: optionalUuid,
    currentPositionId: optionalUuid,
    currentJobGradeId: optionalUuid,
  })
  .superRefine((data, ctx) => {
    const hasPlacement =
      data.currentDepartmentId ||
      data.currentPositionId ||
      data.currentJobGradeId
    if (!data.employmentStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Employment start date is required.",
        path: ["employmentStartDate"],
      })
    }
    if (!hasPlacement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one placement reference (department, position, or grade) is required.",
        path: ["currentDepartmentId"],
      })
    }
  })

export const employeeProfilePhotoFormSchema = z.object({
  employeeId: z.string().uuid(),
  profilePhotoBlobUrl: trimmedNonEmpty.max(2048),
})

export const employeeMasterChangeMetaFormSchema = z.object({
  effectiveDate: optionalIsoDateOnly,
  reason: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(2000).optional()
  ),
  approvalReference: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(500).optional()
  ),
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

export const rehireEmployeeFormSchema = z.object({
  employeeId: z.string().uuid(),
  rehireDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Rehire date must be YYYY-MM-DD"),
  reason: z.preprocess(
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
  /** IETF language tag, e.g. "en", "ms", "vi", "zh-Hans". HRM-EMP-REC-004. */
  languagePreference: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(35).optional()
  ),
})

export const HRM_EMPLOYMENT_TYPES = [
  "permanent",
  "contract",
  "internship",
  "part_time",
  "probationary",
  "freelance",
] as const

export type HrmEmploymentType = (typeof HRM_EMPLOYMENT_TYPES)[number]

export const HRM_WORKER_CATEGORIES = [
  "executive",
  "managerial",
  "professional",
  "technical",
  "clerical",
  "operational",
] as const

export type HrmWorkerCategory = (typeof HRM_WORKER_CATEGORIES)[number]

export const employeeContactFormSchema = z.object({
  employeeId: z.string().uuid(),
  workEmail: optionalEmail,
  workPhone: optionalTrimmed,
  personalEmail: optionalEmail,
  personalPhone: optionalTrimmed,
  // Residential address
  addressLine1: optionalTrimmed,
  addressLine2: optionalTrimmed,
  city: optionalTrimmed,
  region: optionalTrimmed,
  postalCode: optionalTrimmed,
  countryCode: optionalShortCode,
  // Mailing address — null/absent means same as residential (HRM-EMP-REC-005)
  mailingAddressSameAsResidential: optionalBoolean,
  mailingAddressLine1: optionalTrimmed,
  mailingAddressLine2: optionalTrimmed,
  mailingCity: optionalTrimmed,
  mailingRegion: optionalTrimmed,
  mailingPostalCode: optionalTrimmed,
  mailingCountryCode: optionalShortCode,
})

export const employeeEmploymentFormSchema = z.object({
  employeeId: z.string().uuid(),
  /** Classification of the working arrangement. HRM-EMP-REC-007. */
  employmentType: z.enum(HRM_EMPLOYMENT_TYPES).optional(),
  employmentStatus: z
    .enum(["active", "probation", "confirmed", "suspended", "terminated"])
    .default("active"),
  employmentStartDate: optionalIsoDateOnly,
  probationEndDate: optionalIsoDateOnly,
  confirmationDate: optionalIsoDateOnly,
  /** Contract start date for fixed-term and contract workers. HRM-EMP-REC-007. */
  contractStartDate: optionalIsoDateOnly,
  /** Contract end date for fixed-term and contract workers. HRM-EMP-REC-007. */
  contractEndDate: optionalIsoDateOnly,
  currentDepartmentId: optionalUuid,
  currentPositionId: optionalUuid,
  currentJobGradeId: optionalUuid,
  managerEmployeeId: optionalUuid,
  /** Dotted-line / matrix manager. HRM-EMP-REC-010. */
  matrixManagerEmployeeId: optionalUuid,
  /** HR business partner or HR owner assigned to this employee. HRM-EMP-REC-010. */
  hrOwnerEmployeeId: optionalUuid,
  /** Workforce classification: executive, managerial, professional, etc. HRM-EMP-REC-008. */
  workerCategory: z.enum(HRM_WORKER_CATEGORIES).optional(),
  /** Grading level within the job family (e.g. L1–L10, IC1–IC5). HRM-EMP-REC-008. */
  employeeLevel: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(32).optional()
  ),
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

/**
 * Singapore statutory profile — CPF, FWL, SHG levy, pass type. HRM-PAY-SG-001.
 */
export const singaporeEmployeeStatutoryProfileSchema = z.strictObject({
  employeeId: z.string().uuid(),
  effectiveFrom: isoDateOnly,
  countryCode: z.literal("SG"),
  taxResidencyCountry: z.literal("SG").default("SG"),
  /** IRAS Income Tax Reference (FIN or NRIC). */
  taxIdentifierType: z
    .enum(["sg_nric", "sg_fin"])
    .default("sg_nric"),
  taxIdentifierNumber: optionalIdentifier,
  /** CPF account number. */
  cpfAccountNumber: optionalIdentifier,
  /** Work pass category: EP | SP | WP | LTVP | PR | Citizen. */
  workPassType: optionalTrimmed,
  /** Work pass expiry — ISO date (YYYY-MM-DD). */
  workPassExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  /** Foreign Worker Levy applicable (WP holders). */
  fwlApplicable: optionalBoolean,
  /** Self-Help Group levy code (CDAC / SINDA / MBMF / ECF). */
  shgLevyCode: optionalTrimmed,
})

/**
 * Indonesia statutory profile — BPJS Ketenagakerjaan, BPJS Kesehatan,
 * PPh 21, NPWP. HRM-PAY-ID-001.
 */
export const indonesiaEmployeeStatutoryProfileSchema = z.strictObject({
  employeeId: z.string().uuid(),
  effectiveFrom: isoDateOnly,
  countryCode: z.literal("ID"),
  taxResidencyCountry: z.literal("ID").default("ID"),
  taxIdentifierType: z.literal("id_npwp").default("id_npwp"),
  /** NPWP (Nomor Pokok Wajib Pajak) — 15-digit tax number. */
  taxIdentifierNumber: optionalIdentifier,
  /** NIK (Nomor Induk Kependudukan) — 16-digit national ID. */
  nationalIdNumber: optionalIdentifier,
  /** BPJS Ketenagakerjaan (employment social security) number. */
  bpjsKetenagakerjaanNumber: optionalIdentifier,
  /** BPJS Kesehatan (health social security) number. */
  bpjsKesehatanNumber: optionalIdentifier,
  /** PPh 21 tax class: TK/0–3, K/0–3, K/I/0–3. */
  pph21TaxClass: optionalTrimmed,
  /** Work city code (kabupaten/kota) for regional salary baseline. */
  workCityCode: optionalTrimmed,
})

export const employeeStatutoryProfileFormSchema = z.discriminatedUnion(
  "countryCode",
  [
    malaysiaEmployeeStatutoryProfileSchema,
    vietnamEmployeeStatutoryProfileSchema,
    singaporeEmployeeStatutoryProfileSchema,
    indonesiaEmployeeStatutoryProfileSchema,
  ]
)

export type CreateEmployeeFormInput = z.infer<typeof createEmployeeFormSchema>
export type UpdateEmployeeFormInput = z.infer<typeof updateEmployeeFormSchema>
export type ArchiveEmployeeFormInput = z.infer<typeof archiveEmployeeFormSchema>
export type RehireEmployeeFormInput = z.infer<typeof rehireEmployeeFormSchema>
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
export type SingaporeEmployeeStatutoryProfileInput = z.infer<
  typeof singaporeEmployeeStatutoryProfileSchema
>
export type IndonesiaEmployeeStatutoryProfileInput = z.infer<
  typeof indonesiaEmployeeStatutoryProfileSchema
>
export type EmployeeStatutoryProfileFormInput = z.infer<
  typeof employeeStatutoryProfileFormSchema
>

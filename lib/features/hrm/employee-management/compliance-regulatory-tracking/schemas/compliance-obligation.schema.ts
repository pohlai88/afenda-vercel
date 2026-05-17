import { z } from "zod"

import {
  HRM_COMPLIANCE_EXCEPTION_AREAS,
  HRM_COMPLIANCE_EXCEPTION_SEVERITIES,
} from "../data/compliance-status.shared"
import {
  HRM_COMPLIANCE_OBLIGATION_KINDS,
  HRM_COMPLIANCE_OBLIGATION_STATUSES,
} from "../data/compliance-obligation.shared"

const uuid = z.string().uuid()
const orgSlug = z.string().min(1)

const isoDateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Must be a date in YYYY-MM-DD format." })

const nullableText = z.string().trim().min(1).max(200).optional()

export const upsertComplianceObligationFormSchema = z.object({
  orgSlug,
  obligationId: uuid.optional(),
  code: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(2000).optional(),
  complianceArea: z.enum(HRM_COMPLIANCE_EXCEPTION_AREAS),
  requirementKind: z.enum(HRM_COMPLIANCE_OBLIGATION_KINDS),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  legalEntityCode: nullableText,
  departmentId: uuid.optional(),
  workLocationCode: nullableText,
  employmentType: nullableText,
  workerCategory: nullableText,
  policyId: nullableText,
  policyVersion: z.string().trim().max(64).optional(),
  acknowledgementDeadline: isoDateOnly.optional(),
  dueDate: isoDateOnly.optional(),
  alertLeadDays: z.coerce.number().int().min(0).max(365).optional(),
  sourceReferenceId: z.string().trim().max(200).optional(),
})

export type UpsertComplianceObligationFormInput = z.infer<
  typeof upsertComplianceObligationFormSchema
>

export const archiveComplianceObligationFormSchema = z.object({
  orgSlug,
  obligationId: uuid,
  status: z.enum(HRM_COMPLIANCE_OBLIGATION_STATUSES).default("archived"),
})

export type ArchiveComplianceObligationFormInput = z.infer<
  typeof archiveComplianceObligationFormSchema
>

export { HRM_COMPLIANCE_OBLIGATION_KINDS, HRM_COMPLIANCE_EXCEPTION_SEVERITIES }

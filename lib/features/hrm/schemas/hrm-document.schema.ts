import { z } from "zod"

export const HRM_DOCUMENT_TYPES = [
  "offer_letter",
  "contract",
  "ic",
  "passport",
  "certification",
  "medical_cert",
  "statutory_pack",
  "payslip",
  "other",
] as const

export const HRM_DOCUMENT_CLASSIFICATIONS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const

export function isHrmDocumentType(
  value: string
): value is (typeof HRM_DOCUMENT_TYPES)[number] {
  return (HRM_DOCUMENT_TYPES as readonly string[]).includes(value)
}

const uuid = z.string().uuid()
const payloadHash = z.string().regex(/^[a-f0-9]{64}$/)

export const attachEmployeeDocumentFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: uuid,
  blobUrl: z.string().url().startsWith("https://"),
  payloadHash,
  mimeType: z.string().min(3).max(128),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(80 * 1024 * 1024),
  title: z.string().min(1).max(512),
  documentType: z.enum(HRM_DOCUMENT_TYPES),
  classification: z.enum(HRM_DOCUMENT_CLASSIFICATIONS),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** When set, attaches this vault row as `signedDocumentId` on the draft contract (same employee). */
  draftContractId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().uuid().optional()
  ),
})

export type AttachEmployeeDocumentFormInput = z.infer<
  typeof attachEmployeeDocumentFormSchema
>

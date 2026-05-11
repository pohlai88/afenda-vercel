import { z } from "zod"

const coordinationEvidenceKindSchema = z.enum(["file", "screenshot"])

export const coordinationEvidenceItemSchema = z.object({
  blobPathname: z.string().min(1),
  url: z.string().url(),
  downloadUrl: z.string().url().nullable(),
  contentType: z.string().min(1).nullable(),
  fileName: z.string().min(1),
  fileSize: z.number().int().nonnegative().nullable(),
  kind: coordinationEvidenceKindSchema,
})

export const createCoordinationContextSchema = z.object({
  subject: z.string().trim().min(1).max(140).optional().nullable(),
  operatorUserIds: z.array(z.string().min(1)).min(1).max(8),
  body: z.string().trim().max(4000).optional().nullable(),
  linkedEntityType: z.string().trim().max(80).optional().nullable(),
  linkedEntityId: z.string().trim().max(200).optional().nullable(),
  linkedEntityLabel: z.string().trim().max(200).optional().nullable(),
  linkedEntityPath: z.string().trim().max(500).optional().nullable(),
})

export const createCoordinationActivitySchema = z
  .object({
    kind: z.enum(["comment", "evidence_added", "status_note"]),
    body: z.string().trim().max(4000).optional().nullable(),
    evidence: z.array(coordinationEvidenceItemSchema).max(8).optional(),
  })
  .superRefine((value, ctx) => {
    const hasBody = Boolean(value.body && value.body.trim().length > 0)
    const hasEvidence = Boolean(value.evidence && value.evidence.length > 0)
    if (!hasBody && !hasEvidence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Either body or evidence is required",
      })
    }
  })

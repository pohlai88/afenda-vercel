import { z } from "zod"

export const candidateStructuredProfileSchema = z
  .object({
    legalName: z.string().min(1).max(200),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(64).optional().or(z.literal("")),
    skills: z.array(z.string().min(1).max(80)).max(50).default([]),
    education: z
      .array(
        z
          .object({
            institution: z.string().min(1).max(200),
            credential: z.string().max(200).optional(),
            year: z.string().max(8).optional(),
          })
          .strict()
      )
      .max(20)
      .default([]),
    workHistory: z
      .array(
        z
          .object({
            employer: z.string().min(1).max(200),
            role: z.string().min(1).max(200),
            startYear: z.string().max(8).optional(),
            endYear: z.string().max(8).optional(),
          })
          .strict()
      )
      .max(30)
      .default([]),
    certifications: z.array(z.string().min(1).max(120)).max(30).default([]),
  })
  .strict()

export type CandidateStructuredProfile = z.infer<
  typeof candidateStructuredProfileSchema
>

export const submitPublicApplicationFormSchema = z.object({
  portalSlug: z.string().min(1),
  requisitionId: z.string().uuid(),
  legalName: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(64).optional().or(z.literal("")),
  source: z.string().max(120).optional().or(z.literal("")),
  skills: z.string().max(2000).optional().or(z.literal("")),
  consented: z.literal("on").optional(),
})

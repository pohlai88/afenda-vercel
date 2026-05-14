import { z } from "zod"

const nd123StatusSchema = z.enum([
  "draft",
  "issued",
  "submitted",
  "adjusted",
  "cancelled",
])

export const issueEinvoiceFormSchema = z.object({
  orgSlug: z.string().min(1),
  templateCode: z.string().min(1).max(32),
  series: z.string().min(1).max(16),
  invoiceNumber: z.string().min(1).max(32),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  buyerName: z.string().min(1).max(512),
  buyerTaxCode: z.string().max(32).optional(),
  currency: z.string().length(3).default("VND"),
  totalAmountVnd: z.coerce.bigint().positive(),
  vatRateBps: z.coerce.number().int().min(0).max(100_000).default(0),
  status: nd123StatusSchema.default("issued"),
})

export type IssueEinvoiceFormInput = z.infer<typeof issueEinvoiceFormSchema>

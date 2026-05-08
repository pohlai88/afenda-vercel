import { z } from "zod"

export const lynxOperatorBodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(8000, "Message is too long"),
})

export type LynxOperatorBody = z.infer<typeof lynxOperatorBodySchema>

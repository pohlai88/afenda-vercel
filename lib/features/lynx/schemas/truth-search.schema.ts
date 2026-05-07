import { z } from "zod"

export const lynxTruthSearchBodySchema = z.object({
  question: z.string().trim().min(1).max(2000),
})

export type LynxTruthSearchBody = z.infer<typeof lynxTruthSearchBodySchema>

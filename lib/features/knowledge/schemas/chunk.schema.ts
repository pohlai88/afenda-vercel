import { z } from "zod"

export const ingestChunkSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(20_000),
})

export const searchSimilarSchema = z.object({
  query: z.string().trim().min(1, "Enter a search phrase").max(2000),
})

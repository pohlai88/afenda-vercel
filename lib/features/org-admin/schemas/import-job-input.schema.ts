import { z } from "zod"

import { IMPORT_ADAPTERS, IMPORT_MAX_CSV_BYTES } from "../constants"

/** Input contract for `createOrgImportJob` Server Action. */
export const importJobInputSchema = z.object({
  adapter: z.enum(IMPORT_ADAPTERS),
  csvText: z
    .string()
    .min(1, "CSV body required")
    .refine(
      (value) =>
        new TextEncoder().encode(value).byteLength <= IMPORT_MAX_CSV_BYTES,
      `CSV exceeds ${Math.floor(IMPORT_MAX_CSV_BYTES / 1024)} KB limit`
    ),
  filename: z.string().trim().max(160).optional(),
})

export type ImportJobInput = z.infer<typeof importJobInputSchema>

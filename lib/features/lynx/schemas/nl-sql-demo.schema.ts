import { z } from "zod"

export const lynxNlDemoQuestionSchema = z.object({
  question: z.string().trim().min(1).max(2000),
})

export type LynxNlDemoQuestionInput = z.infer<typeof lynxNlDemoQuestionSchema>

export const lynxNlDemoGeneratedSqlSchema = z.object({
  query: z.string().trim().min(1).max(8000),
})

export const lynxNlDemoExplanationRowSchema = z.object({
  section: z.string(),
  explanation: z.string(),
})

export const lynxNlDemoExplanationsSchema = z.array(
  lynxNlDemoExplanationRowSchema
)

/** Chart configuration — aligned with Vercel Labs natural-language-postgres demo. */
export const lynxNlDemoChartConfigSchema = z.object({
  description: z.string(),
  takeaway: z.string(),
  type: z.enum(["bar", "line", "area", "pie"]),
  title: z.string(),
  xKey: z.string(),
  yKeys: z.array(z.string()),
  multipleLines: z.boolean().nullable(),
  measurementColumn: z.string().nullable(),
  lineCategories: z.array(z.string()).nullable(),
  colors: z.record(z.string(), z.string()).nullable(),
  legend: z.boolean(),
})

export type LynxNlDemoChartConfig = z.infer<typeof lynxNlDemoChartConfigSchema>

export type LynxNlDemoResultRow = Record<string, string | number | null>

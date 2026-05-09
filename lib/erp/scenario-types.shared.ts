import { z } from "zod"

/** Kebab-case operational simulation identifiers — stable across replay + CLI. */
export const scenarioIdSchema = z
  .string()
  .min(4)
  .max(128)
  .regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u)

export type ScenarioId = z.infer<typeof scenarioIdSchema>

export const simulationReplayInputSchema = z.object({
  scenarioId: scenarioIdSchema,
  organizationId: z.string().uuid(),
})

export type SimulationReplayInput = z.infer<typeof simulationReplayInputSchema>

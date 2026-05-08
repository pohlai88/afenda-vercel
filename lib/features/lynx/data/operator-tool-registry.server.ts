import "server-only"

import { tool, type Tool } from "ai"
import type { ZodTypeAny } from "zod"

export type LynxToolRisk = "low" | "medium" | "high"
export type LynxToolCategory =
  | "knowledge"
  | "contacts"
  | "operations"
  | "governance"
export type LynxToolAccess = "read" | "write"
/** ERP-facing sensitivity — procurement, imports, policies, workflow state, not only personal data. */
export type LynxToolDataSensitivity = "none" | "low" | "medium" | "high"
export type LynxToolAudit = "silent" | "record"

export type GovernedLynxToolDefinition<
  TSchema extends ZodTypeAny = ZodTypeAny,
> = {
  id: string
  description: string
  risk: LynxToolRisk
  category: LynxToolCategory
  access: LynxToolAccess
  dataSensitivity: LynxToolDataSensitivity
  audit: LynxToolAudit
  schema: TSchema
  /** Tool implementations accept `unknown` so heterogeneous registries type-check; parse with `schema` first. */
  execute: (input: unknown) => Promise<unknown>
}

export type LynxOperatorToolRegistry = readonly GovernedLynxToolDefinition[]

/** Internal adapter — do not re-export from `#features/lynx` barrel. */
export function registryToAiSdkTools(
  registry: LynxOperatorToolRegistry
): Record<string, Tool> {
  const out: Record<string, Tool> = {}
  for (const def of registry) {
    out[def.id] = tool({
      description: def.description,
      inputSchema: def.schema,
      execute: def.execute,
    })
  }
  return out
}

export function registryToolIds(
  registry: LynxOperatorToolRegistry
): readonly string[] {
  return registry.map((d) => d.id)
}

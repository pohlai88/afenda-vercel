import "server-only"

import { ToolLoopAgent, stepCountIs } from "ai"

import { LYNX_OPERATOR_MAX_STEPS, LYNX_OPERATOR_TOOL_IDS } from "../constants"
import type { LynxOperatorToolId } from "../types"
import { buildLynxOperatorSystemPrompt } from "./operator-prompt.server"
import { createLynxOperatorToolRegistry } from "./operator-tools.server"
import { registryToAiSdkTools } from "./operator-tool-registry.server"
import {
  resolveLynxTruthStreamModel,
  resolveLynxTruthStreamProviderOptions,
} from "./truth-generation-model.server"

export type LynxExecutionMode =
  | "interactive"
  | "workflow"
  | "background"
  | "slack"

export type LynxOperatorStreamInput = {
  prompt: string
  providerOptions?: ReturnType<typeof resolveLynxTruthStreamProviderOptions>
  maxOutputTokens?: number
}

export type LynxOperatorRuntime = {
  stream: (
    input: LynxOperatorStreamInput
  ) => ReturnType<ToolLoopAgent["stream"]>
  toolIds: readonly LynxOperatorToolId[]
  providerOptions: ReturnType<typeof resolveLynxTruthStreamProviderOptions>
  executionMode: LynxExecutionMode
}

export function createLynxOperatorRuntime(args: {
  organizationId: string
  executionMode?: LynxExecutionMode
}): LynxOperatorRuntime | null {
  const model = resolveLynxTruthStreamModel()
  if (!model) return null
  const registry = createLynxOperatorToolRegistry(args.organizationId)
  const agent = new ToolLoopAgent({
    model,
    instructions: buildLynxOperatorSystemPrompt(),
    tools: registryToAiSdkTools(registry),
    stopWhen: stepCountIs(LYNX_OPERATOR_MAX_STEPS),
  })
  const providerOptions = resolveLynxTruthStreamProviderOptions()
  return {
    stream: (input: LynxOperatorStreamInput) => {
      const mergedProvider = input.providerOptions ?? providerOptions
      return agent.stream({
        prompt: input.prompt,
        ...(mergedProvider ? { providerOptions: mergedProvider } : {}),
        ...(input.maxOutputTokens != null
          ? { maxOutputTokens: input.maxOutputTokens }
          : {}),
      })
    },
    toolIds: LYNX_OPERATOR_TOOL_IDS,
    providerOptions,
    executionMode: args.executionMode ?? "interactive",
  }
}

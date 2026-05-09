import "server-only"

import { AsyncLocalStorage } from "node:async_hooks"

export type SimulationContext = {
  simulationRunId: string
  scenarioId: string
  scenarioVersion: number
  seed: string
}

const simulationAsyncLocalStorage = new AsyncLocalStorage<SimulationContext>()

export function getSimulationContextOrNull(): SimulationContext | null {
  return simulationAsyncLocalStorage.getStore() ?? null
}

export async function runWithSimulationContext<T>(
  context: SimulationContext,
  fn: () => Promise<T>
): Promise<T> {
  return simulationAsyncLocalStorage.run(context, fn)
}

import { describe, expect, it } from "vitest"

import {
  OPERATIONAL_SIMULATION_ENV,
  isOperationalSimulationEnabled,
} from "#features/simulation"

describe("#features/simulation barrel", () => {
  it("exposes the simulation gate env key", () => {
    expect(OPERATIONAL_SIMULATION_ENV).toBe("AFENDA_ENABLE_SIMULATION")
  })

  it("reports whether simulation is enabled from env", () => {
    expect(typeof isOperationalSimulationEnabled()).toBe("boolean")
  })
})

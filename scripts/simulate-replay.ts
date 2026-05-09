/**
 * Replay a registered operational simulation scenario against an organization.
 *
 * Usage:
 *   node scripts/with-env.mjs tsx scripts/simulate-replay.ts <organizationId> <scenarioId>
 *
 * Requires `AFENDA_ENABLE_SIMULATION=1` and database URL (see `.env.config.example`).
 */
import { scenarioIdSchema } from "#lib/erp/scenario-types.shared"
import { isOperationalSimulationEnabled } from "#features/simulation"
import { replayOperationalScenarioForOrganization } from "#features/simulation/server"

async function main() {
  if (!isOperationalSimulationEnabled()) {
    console.error(
      "Operational simulation is disabled. Set AFENDA_ENABLE_SIMULATION=1 in the environment."
    )
    process.exit(2)
  }

  const organizationId = process.argv[2]?.trim()
  const scenarioIdRaw = process.argv[3]?.trim()
  if (!organizationId || !scenarioIdRaw) {
    console.error(
      "Usage: node scripts/with-env.mjs tsx scripts/simulate-replay.ts <organizationId> <scenarioId>"
    )
    process.exit(2)
  }

  const parsed = scenarioIdSchema.safeParse(scenarioIdRaw)
  if (!parsed.success) {
    console.error("Invalid scenario identifier.")
    process.exit(2)
  }

  const { simulationRunId, oneThingId } =
    await replayOperationalScenarioForOrganization({
      organizationId,
      scenarioId: parsed.data,
      actorUserId: null,
      actorSessionId: null,
    })

  console.log(
    JSON.stringify(
      {
        ok: true,
        organizationId,
        scenarioId: parsed.data,
        simulationRunId,
        oneThingId,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

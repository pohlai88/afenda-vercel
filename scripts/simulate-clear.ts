/**
 * Delete persisted audit rows for one simulation run, then record a clear audit.
 *
 * Usage:
 *   node scripts/with-env.mjs tsx scripts/simulate-clear.ts <organizationId> <simulationRunId>
 *
 * Requires `AFENDA_ENABLE_SIMULATION=1` and database URL (see `.env.config.example`).
 */
import { writeIamAuditEvent } from "#lib/auth"
import { isOperationalSimulationEnabled } from "#features/simulation"
import { deleteOperationalSimulationRun } from "#features/simulation/server"

async function main() {
  if (!isOperationalSimulationEnabled()) {
    console.error(
      "Operational simulation is disabled. Set AFENDA_ENABLE_SIMULATION=1 in the environment."
    )
    process.exit(2)
  }

  const organizationId = process.argv[2]?.trim()
  const simulationRunId = process.argv[3]?.trim()
  if (!organizationId || !simulationRunId || simulationRunId.length < 8) {
    console.error(
      "Usage: node scripts/with-env.mjs tsx scripts/simulate-clear.ts <organizationId> <simulationRunId>"
    )
    process.exit(2)
  }

  const result = await deleteOperationalSimulationRun({
    organizationId,
    simulationRunId,
  })

  await writeIamAuditEvent({
    action: "org.simulation.scenario.clear",
    organizationId,
    actorUserId: null,
    actorSessionId: null,
    resourceType: "simulation.run",
    resourceId: simulationRunId,
    metadata: {
      deletedAudit: result.deletedAudit,
    },
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        organizationId,
        simulationRunId,
        deletedAudit: result.deletedAudit,
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

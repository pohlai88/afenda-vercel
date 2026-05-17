export const HRM_SNAPSHOT_DELIVERY_AUDIT_ACTION =
  "erp.hrm.snapshot.delivered" as const

export const HRM_SNAPSHOT_DELIVERY_BATCH_LIMIT = 50

/** Weekly tick runs Monday 09:15 UTC; monthly tick runs day 1 at 09:30 UTC. */
export function shouldRunHrmSnapshotDelivery(
  now: Date,
  cadence: "weekly" | "monthly"
): boolean {
  const day = now.getUTCDay()
  const date = now.getUTCDate()
  if (cadence === "weekly") {
    return day === 1
  }
  return date === 1
}

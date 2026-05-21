import "server-only"

import { eq, sql } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmTimeClockDevice } from "#lib/db/schema"

import { HRM_TCI_AUDIT } from "../tci.contract"

export type TimeClockSyncWatchSummary = {
  readonly scanned: number
  readonly failed: number
  readonly alerted: number
}

/**
 * Marks devices stuck in `syncing` or `failed` beyond threshold for admin attention.
 */
export async function runTimeClockSyncWatchTick(): Promise<TimeClockSyncWatchSummary> {
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const failedDevices = await db
    .select({
      id: hrmTimeClockDevice.id,
      organizationId: hrmTimeClockDevice.organizationId,
    })
    .from(hrmTimeClockDevice)
    .where(
      sql`${hrmTimeClockDevice.syncStatus} = 'failed'
        OR (${hrmTimeClockDevice.syncStatus} = 'syncing' AND ${hrmTimeClockDevice.lastSyncAt} < ${staleBefore})`
    )

  let alerted = 0
  for (const device of failedDevices) {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_TCI_AUDIT.syncFail,
      actorUserId: "system",
      actorSessionId: null,
      organizationId: device.organizationId,
      resourceType: "hrm_time_clock_device",
      resourceId: device.id,
      metadata: { watch: "hrm-time-clock-sync" },
    })
    await db
      .update(hrmTimeClockDevice)
      .set({ syncStatus: "failed", updatedAt: sql`now()` })
      .where(eq(hrmTimeClockDevice.id, device.id))
    alerted += 1
  }

  const allDevices = await db
    .select({ id: hrmTimeClockDevice.id })
    .from(hrmTimeClockDevice)

  return {
    scanned: allDevices.length,
    failed: failedDevices.length,
    alerted,
  }
}

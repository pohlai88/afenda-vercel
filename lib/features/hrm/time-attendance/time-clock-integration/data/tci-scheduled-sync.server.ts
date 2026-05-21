import "server-only"

import { and, eq, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmTimeClockDevice } from "#lib/db/schema"
import { logUnexpectedServerError } from "#lib/logger.server"

import { ingestTimeClockBatch } from "./tci-punch-commands.server"
import {
  createTimeClockNotificationDispatcher,
  type TimeClockNotificationDispatcher,
} from "./tci-notification.server"
import {
  isDeviceConfiguredForScheduledVendorSync,
  isDeviceDueForScheduledSync,
  resolveTimeClockSyncIntervalMs,
} from "./tci-scheduled-sync.shared"
import { resolveTimeClockVendorAdapter } from "./tci-vendor-adapters.server"
import { runTimeClockSyncWatchTick } from "./tci-sync-watch.server"

export type TimeClockScheduledSyncSummary = {
  readonly candidates: number
  readonly polled: number
  readonly skippedNotDue: number
  readonly batchesCompleted: number
  readonly punchesAccepted: number
  readonly failures: number
  readonly notificationsSent: number
}

export type TimeClockCronSyncSummary = {
  readonly watch: Awaited<ReturnType<typeof runTimeClockSyncWatchTick>>
  readonly scheduled: TimeClockScheduledSyncSummary
}

/**
 * HRM-TCI-011 — scheduled vendor punch pull (`poll:`, `vendor:zebra:`, `vendor:ukg:`).
 * Composes sync watch (HRM-TCI-026) in the same cron tick.
 */
export async function runTimeClockScheduledSyncTick(input?: {
  readonly notify?: TimeClockNotificationDispatcher
}): Promise<TimeClockScheduledSyncSummary> {
  const notify =
    input?.notify ?? createTimeClockNotificationDispatcher()
  const intervalMs = resolveTimeClockSyncIntervalMs(
    process.env.HRM_TIME_CLOCK_SYNC_INTERVAL_MINUTES
  )
  const now = new Date()

  const devices = await db
    .select({
      id: hrmTimeClockDevice.id,
      organizationId: hrmTimeClockDevice.organizationId,
      name: hrmTimeClockDevice.name,
      externalDeviceId: hrmTimeClockDevice.externalDeviceId,
      integrationCredentialRef: hrmTimeClockDevice.integrationCredentialRef,
      lastSyncAt: hrmTimeClockDevice.lastSyncAt,
    })
    .from(hrmTimeClockDevice)
    .where(
      and(
        eq(hrmTimeClockDevice.state, "active"),
        isNotNull(hrmTimeClockDevice.integrationCredentialRef)
      )
    )

  const candidates = devices.filter((device) =>
    isDeviceConfiguredForScheduledVendorSync(device.integrationCredentialRef)
  )

  let polled = 0
  let skippedNotDue = 0
  let batchesCompleted = 0
  let punchesAccepted = 0
  let failures = 0
  let notificationsSent = 0

  for (const device of candidates) {
    const credentialRef = device.integrationCredentialRef?.trim()
    if (!credentialRef) continue

    if (
      !isDeviceDueForScheduledSync({
        lastSyncAt: device.lastSyncAt,
        now,
        intervalMs,
      })
    ) {
      skippedNotDue += 1
      continue
    }

    const adapter = resolveTimeClockVendorAdapter(credentialRef)
    if (!adapter) continue

    polled += 1

    await db
      .update(hrmTimeClockDevice)
      .set({ syncStatus: "syncing", updatedAt: now })
      .where(eq(hrmTimeClockDevice.id, device.id))

    try {
      const vendorPunches = await adapter.pullPunches({
        organizationId: device.organizationId,
        deviceId: device.id,
        externalDeviceId: device.externalDeviceId,
        integrationCredentialRef: credentialRef,
      })

      if (vendorPunches.length > 0) {
        const result = await ingestTimeClockBatch(
          {
            organizationId: device.organizationId,
            userId: "system",
            sessionId: null,
          },
          {
            organizationId: device.organizationId,
            sourceKind: "scheduled",
            deviceId: device.id,
            punches: vendorPunches.map((punch) => ({
              ...punch,
              externalDeviceId: device.externalDeviceId,
            })),
          }
        )

        if ("batchId" in result) {
          batchesCompleted += 1
          punchesAccepted += result.accepted
        } else {
          failures += 1
          notificationsSent += await notify.notifyDeviceSyncFailure({
            organizationId: device.organizationId,
            deviceId: device.id,
            deviceName: device.name,
            externalDeviceId: device.externalDeviceId,
            reason: "scheduled_ingest",
            detail:
              "errors" in result && result.errors?.form
                ? result.errors.form
                : "Vendor ingest batch failed.",
          })
        }
      }

      await db
        .update(hrmTimeClockDevice)
        .set({
          syncStatus: "ok",
          lastSyncAt: now,
          updatedAt: now,
        })
        .where(eq(hrmTimeClockDevice.id, device.id))
    } catch (error) {
      failures += 1
      logUnexpectedServerError("hrm.time_clock.scheduled_sync.device_failed", error, {
        deviceId: device.id,
        organizationId: device.organizationId,
        adapterId: adapter.id,
      })
      await db
        .update(hrmTimeClockDevice)
        .set({ syncStatus: "failed", updatedAt: now })
        .where(eq(hrmTimeClockDevice.id, device.id))

      notificationsSent += await notify.notifyDeviceSyncFailure({
        organizationId: device.organizationId,
        deviceId: device.id,
        deviceName: device.name,
        externalDeviceId: device.externalDeviceId,
        reason: "scheduled_poll",
        detail: error instanceof Error ? error.message : "Vendor poll failed.",
      })
    }
  }

  return {
    candidates: candidates.length,
    polled,
    skippedNotDue,
    batchesCompleted,
    punchesAccepted,
    failures,
    notificationsSent,
  }
}

export async function runTimeClockCronSyncTick(): Promise<TimeClockCronSyncSummary> {
  const notify = createTimeClockNotificationDispatcher()
  const [watch, scheduled] = await Promise.all([
    runTimeClockSyncWatchTick({ notify }),
    runTimeClockScheduledSyncTick({ notify }),
  ])
  return { watch, scheduled }
}

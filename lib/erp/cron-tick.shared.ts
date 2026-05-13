/**
 * Shared shapes for bounded HRM cron tick drivers (aging watch, document
 * expiry, probation) and partial overlap with statutory retry (scanned-only).
 */

/** Optional tick inputs accepted by aging / document / probation runners. */
export type CronTickInput = {
  readonly now?: Date
  readonly batchLimit?: number
}

/** Every tick that scans a candidate set reports how many rows were examined. */
export type CronTickScannedSummary = {
  readonly scanned: number
}

/** Watchers that emit IAM audit rows per tick include an emitted total. */
export type CronTickScannedEmittedSummary = CronTickScannedSummary & {
  readonly emitted: number
}

import { isVendorScheduledSyncCredential } from "./tci-vendor-adapter.shared"

export const TCI_DEFAULT_SYNC_INTERVAL_MINUTES = 360

export function resolveTimeClockSyncIntervalMs(
  envMinutes: string | undefined
): number {
  const parsed = Number(envMinutes)
  if (!Number.isFinite(parsed) || parsed < 15) {
    return TCI_DEFAULT_SYNC_INTERVAL_MINUTES * 60 * 1000
  }
  return parsed * 60 * 1000
}

export function isDeviceConfiguredForScheduledVendorSync(
  integrationCredentialRef: string | null | undefined
): boolean {
  return isVendorScheduledSyncCredential(integrationCredentialRef)
}

export function isDeviceDueForScheduledSync(input: {
  readonly lastSyncAt: Date | null
  readonly now: Date
  readonly intervalMs: number
}): boolean {
  if (!input.lastSyncAt) return true
  return input.now.getTime() - input.lastSyncAt.getTime() >= input.intervalMs
}

export function formatScheduledSyncCredentialHint(): string {
  return "poll:https://… · vendor:zebra:https://… · vendor:ukg:https://…"
}

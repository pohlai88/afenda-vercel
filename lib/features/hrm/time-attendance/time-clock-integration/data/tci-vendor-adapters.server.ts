import "server-only"

import { httpPollTimeClockVendorAdapter } from "./tci-http-poll-vendor.adapter.server"
import { ukgTimeClockVendorAdapter } from "./tci-ukg-vendor.adapter.server"
import { zebraTimeClockVendorAdapter } from "./tci-zebra-vendor.adapter.server"
import type { TimeClockVendorAdapter } from "./tci-vendor-adapter.shared"

export const TCI_VENDOR_ADAPTERS: readonly TimeClockVendorAdapter[] = [
  zebraTimeClockVendorAdapter,
  ukgTimeClockVendorAdapter,
  httpPollTimeClockVendorAdapter,
]

export function resolveTimeClockVendorAdapter(
  integrationCredentialRef: string
): TimeClockVendorAdapter | null {
  return (
    TCI_VENDOR_ADAPTERS.find((adapter) =>
      adapter.supports(integrationCredentialRef)
    ) ?? null
  )
}

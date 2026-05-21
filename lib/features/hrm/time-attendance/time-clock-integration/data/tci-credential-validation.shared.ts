import {
  isVendorScheduledSyncCredential,
  parseUkgVendorPollUrl,
  parseVendorPollUrl,
  parseZebraVendorPollUrl,
} from "./tci-vendor-adapter.shared"

/**
 * Device `integrationCredentialRef` may be a scheduled vendor poll URL
 * (`poll:`, `vendor:zebra:`, `vendor:ukg:`) or an opaque API ingest secret.
 */
export function validateTimeClockIntegrationCredentialRef(
  ref: string
): string | null {
  const trimmed = ref.trim()
  if (!trimmed) return null

  if (isVendorScheduledSyncCredential(trimmed)) {
    const hasUrl =
      parseVendorPollUrl(trimmed) != null ||
      parseZebraVendorPollUrl(trimmed) != null ||
      parseUkgVendorPollUrl(trimmed) != null
    return hasUrl
      ? null
      : "Scheduled sync credential must be poll:, vendor:zebra:, or vendor:ukg: followed by a valid http(s) URL."
  }

  if (trimmed.length < 8) {
    return "API ingest secret must be at least 8 characters."
  }

  return null
}

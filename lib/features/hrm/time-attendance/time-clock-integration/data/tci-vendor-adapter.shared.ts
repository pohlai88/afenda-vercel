import type { TimeClockIngestPunchInput } from "../schemas/tci.schema"

export const TCI_VENDOR_POLL_CREDENTIAL_PREFIX = "poll:" as const
export const TCI_VENDOR_ZEBRA_CREDENTIAL_PREFIX = "vendor:zebra:" as const
export const TCI_VENDOR_UKG_CREDENTIAL_PREFIX = "vendor:ukg:" as const

const VENDOR_URL_PREFIXES = [
  TCI_VENDOR_POLL_CREDENTIAL_PREFIX,
  TCI_VENDOR_ZEBRA_CREDENTIAL_PREFIX,
  TCI_VENDOR_UKG_CREDENTIAL_PREFIX,
] as const

export type TimeClockVendorPullContext = {
  readonly organizationId: string
  readonly deviceId: string
  readonly externalDeviceId: string
  readonly integrationCredentialRef: string
}

export type TimeClockVendorAdapter = {
  readonly id: string
  supports(credentialRef: string): boolean
  pullPunches(
    ctx: TimeClockVendorPullContext
  ): Promise<readonly Omit<TimeClockIngestPunchInput, "externalDeviceId">[]>
}

function parseVendorCredentialUrl(
  integrationCredentialRef: string | null | undefined,
  prefix: (typeof VENDOR_URL_PREFIXES)[number]
): string | null {
  const ref = integrationCredentialRef?.trim()
  if (!ref?.startsWith(prefix)) return null
  const url = ref.slice(prefix.length).trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

export function parseVendorPollUrl(
  integrationCredentialRef: string | null | undefined
): string | null {
  return parseVendorCredentialUrl(
    integrationCredentialRef,
    TCI_VENDOR_POLL_CREDENTIAL_PREFIX
  )
}

export function parseZebraVendorPollUrl(
  integrationCredentialRef: string | null | undefined
): string | null {
  return parseVendorCredentialUrl(
    integrationCredentialRef,
    TCI_VENDOR_ZEBRA_CREDENTIAL_PREFIX
  )
}

export function parseUkgVendorPollUrl(
  integrationCredentialRef: string | null | undefined
): string | null {
  return parseVendorCredentialUrl(
    integrationCredentialRef,
    TCI_VENDOR_UKG_CREDENTIAL_PREFIX
  )
}

export function isVendorScheduledSyncCredential(
  integrationCredentialRef: string | null | undefined
): boolean {
  const ref = integrationCredentialRef?.trim()
  if (!ref) return false
  return VENDOR_URL_PREFIXES.some((prefix) => ref.startsWith(prefix))
}

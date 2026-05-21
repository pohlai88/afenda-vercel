import "server-only"

import {
  parseGenericVendorPollPayload,
} from "./tci-vendor-payload.shared"
import {
  parseVendorPollUrl,
  TCI_VENDOR_POLL_CREDENTIAL_PREFIX,
  type TimeClockVendorAdapter,
  type TimeClockVendorPullContext,
} from "./tci-vendor-adapter.shared"
import { fetchVendorPollJson } from "./tci-vendor-fetch.server"

export const httpPollTimeClockVendorAdapter: TimeClockVendorAdapter = {
  id: "http_poll",

  supports(credentialRef: string): boolean {
    return credentialRef.trim().startsWith(TCI_VENDOR_POLL_CREDENTIAL_PREFIX)
  },

  async pullPunches(ctx: TimeClockVendorPullContext) {
    const pollUrl = parseVendorPollUrl(ctx.integrationCredentialRef)
    if (!pollUrl) return []

    const json = await fetchVendorPollJson(pollUrl)
    return parseGenericVendorPollPayload(json)
  },
}

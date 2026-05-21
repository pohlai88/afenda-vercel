import "server-only"

import { parseZebraVendorPollPayload } from "./tci-vendor-payload.shared"
import {
  parseZebraVendorPollUrl,
  TCI_VENDOR_ZEBRA_CREDENTIAL_PREFIX,
  type TimeClockVendorAdapter,
  type TimeClockVendorPullContext,
} from "./tci-vendor-adapter.shared"
import { fetchVendorPollJson } from "./tci-vendor-fetch.server"

/** Zebra Workforce Connect-style JSON envelope (`transactions[]`). */
export const zebraTimeClockVendorAdapter: TimeClockVendorAdapter = {
  id: "zebra",

  supports(credentialRef: string): boolean {
    return credentialRef.trim().startsWith(TCI_VENDOR_ZEBRA_CREDENTIAL_PREFIX)
  },

  async pullPunches(ctx: TimeClockVendorPullContext) {
    const pollUrl = parseZebraVendorPollUrl(ctx.integrationCredentialRef)
    if (!pollUrl) return []

    const json = await fetchVendorPollJson(pollUrl, {
      "X-External-Device-Id": ctx.externalDeviceId,
      "X-Zebra-Integration": "afenda-time-clock",
    })
    return parseZebraVendorPollPayload(json)
  },
}

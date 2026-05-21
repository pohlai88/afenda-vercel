import "server-only"

import { parseUkgVendorPollPayload } from "./tci-vendor-payload.shared"
import {
  parseUkgVendorPollUrl,
  TCI_VENDOR_UKG_CREDENTIAL_PREFIX,
  type TimeClockVendorAdapter,
  type TimeClockVendorPullContext,
} from "./tci-vendor-adapter.shared"
import { fetchVendorPollJson } from "./tci-vendor-fetch.server"

/** UKG Dimensions-style punch export (`punchExports[]`). */
export const ukgTimeClockVendorAdapter: TimeClockVendorAdapter = {
  id: "ukg",

  supports(credentialRef: string): boolean {
    return credentialRef.trim().startsWith(TCI_VENDOR_UKG_CREDENTIAL_PREFIX)
  },

  async pullPunches(ctx: TimeClockVendorPullContext) {
    const pollUrl = parseUkgVendorPollUrl(ctx.integrationCredentialRef)
    if (!pollUrl) return []

    const json = await fetchVendorPollJson(pollUrl, {
      "X-Device-External-Id": ctx.externalDeviceId,
      "X-Ukg-Integration": "afenda-time-clock",
    })
    return parseUkgVendorPollPayload(json, ctx.externalDeviceId)
  },
}

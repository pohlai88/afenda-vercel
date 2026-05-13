import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next"

import { vercelFlags } from "#flags"

export const GET = createFlagsDiscoveryEndpoint(() =>
  getProviderData(vercelFlags)
)

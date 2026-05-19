import { StatusControlSurface } from "#components2/legal-docs"

import { getCachedOpenStatusPublicSnapshot } from "../data/openstatus-status.server"

export async function LegalDocsStatusBody() {
  const snapshot = await getCachedOpenStatusPublicSnapshot()

  return <StatusControlSurface snapshot={snapshot} />
}

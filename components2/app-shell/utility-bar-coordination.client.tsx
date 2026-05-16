"use client"

import { OperationalCoordinationConsole } from "#features/coordination/client"

export function UtilityBarCoordinationPanel({
  organizationId = null,
}: {
  organizationId?: string | null
}) {
  if (!organizationId) return null
  return <OperationalCoordinationConsole orgId={organizationId} />
}

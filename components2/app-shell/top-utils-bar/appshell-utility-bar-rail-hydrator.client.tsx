"use client"

import { useEffect, useRef } from "react"

import type { UtilityBarRailSnapshot } from "#features/nexus/client"

import { useUtilityBarStore } from "../../stores/utility-bar.store"

export function UtilityBarRailHydrator({
  snapshot,
}: {
  snapshot: UtilityBarRailSnapshot
}) {
  const hydrateFromRailSnapshot = useUtilityBarStore(
    (s) => s.hydrateFromRailSnapshot
  )
  const snapshotKey = `${snapshot.visibleIds.join(",")}|${snapshot.mandatoryIds.join(",")}`
  const hydratedKey = useRef<string | null>(null)

  useEffect(() => {
    if (hydratedKey.current === snapshotKey) return
    hydratedKey.current = snapshotKey
    hydrateFromRailSnapshot(snapshot)
  }, [hydrateFromRailSnapshot, snapshot, snapshotKey])

  return null
}

export type BrowserConnectionSnapshot = {
  effectiveType: string | null
  downlinkMbps: number | null
  rttMs: number | null
  saveData: boolean
}

export function isBrowserConnectionSlow(
  snapshot: BrowserConnectionSnapshot | null
): boolean {
  if (!snapshot) return false

  const effectiveType = snapshot.effectiveType?.trim().toLowerCase() ?? ""
  if (effectiveType === "2g" || effectiveType === "slow-2g") {
    return true
  }

  if (
    snapshot.downlinkMbps !== null &&
    Number.isFinite(snapshot.downlinkMbps) &&
    snapshot.downlinkMbps < 0.5
  ) {
    return true
  }

  return false
}

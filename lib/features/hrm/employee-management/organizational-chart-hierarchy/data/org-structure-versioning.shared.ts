export type EffectiveWindow = {
  readonly effectiveFrom: Date
  readonly effectiveTo: Date | null
}

export function isEffectiveWindowAsOf(
  window: EffectiveWindow,
  asOf: Date
): boolean {
  const asOfDay = startOfUtcDay(asOf).getTime()
  return (
    startOfUtcDay(window.effectiveFrom).getTime() <= asOfDay &&
    (window.effectiveTo === null ||
      startOfUtcDay(window.effectiveTo).getTime() >= asOfDay)
  )
}

export function chooseEffectiveVersion<T extends EffectiveWindow>(
  versions: readonly T[],
  asOf: Date
): T | null {
  const effective = versions
    .filter((version) => isEffectiveWindowAsOf(version, asOf))
    .sort(
      (a, b) =>
        startOfUtcDay(b.effectiveFrom).getTime() -
        startOfUtcDay(a.effectiveFrom).getTime()
    )
  return effective[0] ?? null
}

export function chooseLatestVersion<T extends { readonly effectiveFrom: Date }>(
  versions: readonly T[]
): T | null {
  const latest = [...versions].sort(
    (a, b) =>
      startOfUtcDay(b.effectiveFrom).getTime() -
      startOfUtcDay(a.effectiveFrom).getTime()
  )
  return latest[0] ?? null
}

export function chooseOrgStructureVersion<T extends EffectiveWindow>(
  versions: readonly T[],
  options: {
    readonly asOfDate?: Date
    readonly includeFuture?: boolean
    readonly now?: Date
  } = {}
): T | null {
  if (options.includeFuture) return chooseLatestVersion(versions)
  return chooseEffectiveVersion(
    versions,
    options.asOfDate ?? options.now ?? new Date()
  )
}

export function assertAppendOnlyEffectiveVersionWindow(
  versions: readonly EffectiveWindow[],
  nextEffectiveFrom: Date,
  input: {
    readonly duplicateError: string
    readonly overlapError: string
  }
): void {
  const nextDay = startOfUtcDay(nextEffectiveFrom).getTime()
  for (const version of versions) {
    const versionStart = startOfUtcDay(version.effectiveFrom).getTime()
    if (versionStart === nextDay) {
      throw new Error(input.duplicateError)
    }
    if (versionStart > nextDay) {
      throw new Error(input.overlapError)
    }
    if (
      version.effectiveTo &&
      startOfUtcDay(version.effectiveTo).getTime() >= nextDay
    ) {
      throw new Error(input.overlapError)
    }
  }
}

export function isFutureEffectiveDate(
  effectiveFrom: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!effectiveFrom) return false
  return startOfUtcDay(effectiveFrom).getTime() > startOfUtcDay(now).getTime()
}

export function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

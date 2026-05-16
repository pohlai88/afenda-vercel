export type AgingWatchCandidate = {
  readonly evidenceId: string
  readonly organizationId: string
  readonly periodId: string | null
  readonly packType: string
  readonly countryCode: string
  readonly rulePackVersion: string
  readonly submittedSinceUpdatedAt: Date
  readonly ageDays: number
}

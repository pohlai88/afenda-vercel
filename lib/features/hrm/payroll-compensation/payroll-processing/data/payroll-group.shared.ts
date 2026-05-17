/** Client-serializable payroll group row for profile assignment UI. */
export type PayrollGroupOption = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly countryCode: string
  readonly paySchedule: string
  readonly payCurrency: string
}

export type ClaimSubmitEmployeeOption = {
  readonly id: string
  readonly employeeNumber: string
  readonly legalName: string
}

export type ClaimSubmitClaimTypeOption = {
  readonly id: string
  readonly code: string
  readonly currency: string
}

export type ClaimSubmitExpenseFundOption = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly currency: string
}

export function toClaimSubmitEmployeeOptions(
  rows: readonly ClaimSubmitEmployeeOption[]
): ClaimSubmitEmployeeOption[] {
  return rows.map((row) => ({
    id: row.id,
    employeeNumber: row.employeeNumber,
    legalName: row.legalName,
  }))
}

export function toClaimSubmitClaimTypeOptions(
  rows: readonly ClaimSubmitClaimTypeOption[]
): ClaimSubmitClaimTypeOption[] {
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    currency: row.currency,
  }))
}

export function toClaimSubmitExpenseFundOptions(
  rows: readonly ClaimSubmitExpenseFundOption[]
): ClaimSubmitExpenseFundOption[] {
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    currency: row.currency,
  }))
}

const LEGAL_ENTITY_CODE_KEY = "legalEntityCode"

export function readPayrollProfileLegalEntityCode(
  statutoryProfileExtras: unknown
): string | null {
  if (
    typeof statutoryProfileExtras !== "object" ||
    statutoryProfileExtras === null ||
    Array.isArray(statutoryProfileExtras)
  ) {
    return null
  }

  const raw = (statutoryProfileExtras as Record<string, unknown>)[
    LEGAL_ENTITY_CODE_KEY
  ]
  if (typeof raw !== "string") {
    return null
  }

  const value = raw.trim()
  return value.length > 0 ? value : null
}

/** Normalizes email for duplicate detection (trim + lowercase). */
export function normalizeEmployeeDuplicateEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Normalizes phone for duplicate detection (trim + remove common formatting). */
export function normalizeEmployeeDuplicatePhone(value: string): string {
  return value.trim().replace(/[\s().-]+/g, "")
}

/** Normalizes identity document numbers so separator formatting cannot bypass duplicate checks. */
export function normalizeEmployeeDuplicateIdentityDocumentNumber(
  value: string
): string {
  return value
    .trim()
    .replace(/[^0-9A-Za-z]+/g, "")
    .toUpperCase()
}

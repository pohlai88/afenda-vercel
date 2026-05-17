/** Normalizes email for duplicate detection (trim + lowercase). */
export function normalizeEmployeeDuplicateEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Normalizes phone for duplicate detection (trim + collapse whitespace). */
export function normalizeEmployeeDuplicatePhone(value: string): string {
  return value.trim().replace(/\s+/g, "")
}

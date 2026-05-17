const MASK_CHAR = "•"

/**
 * Masks a bank account number for display — reveals last four digits only (HRM-ESS-022).
 */
export function maskBankAccountNumber(value: string | null | undefined): string {
  if (!value?.trim()) return ""
  const digits = value.replace(/\s/g, "")
  if (digits.length <= 4) return MASK_CHAR.repeat(digits.length)
  return `${MASK_CHAR.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

/**
 * Masks tax / national ID values — reveals last two characters when length allows (HRM-ESS-022).
 */
export function maskTaxId(value: string | null | undefined): string {
  if (!value?.trim()) return ""
  const normalized = value.trim()
  if (normalized.length <= 2) return MASK_CHAR.repeat(normalized.length)
  return `${MASK_CHAR.repeat(normalized.length - 2)}${normalized.slice(-2)}`
}

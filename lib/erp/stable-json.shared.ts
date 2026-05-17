/**
 * Deterministic JSON serialization for audit hashes and tamper-evident envelopes.
 * Keys are sorted; `undefined` values are omitted.
 */
export function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null"
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(",")}]`
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableJsonStringify(entryValue)}`
    )
    .join(",")}}`
}

/** @deprecated Prefer `stableJsonStringify` — payroll-close historical name. */
export const stablePayrollCloseStringify = stableJsonStringify

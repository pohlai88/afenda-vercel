/**
 * Stable JSON log shape for Vercel Runtime Logs / log drains (`console.info` lines).
 * Does not include raw PII — only action taxonomy and coarse flags.
 */
export const IAM_AUDIT_TELEMETRY_TAG = "afenda.iam.audit" as const

/**
 * Emit one JSON line per committed audit row when enabled.
 *
 * - Local dev: off unless `AFENDA_IAM_AUDIT_LOG=1`.
 * - Vercel: on unless `AFENDA_IAM_AUDIT_LOG=0`.
 */
export function resolveIamAuditTelemetryEnabled(): boolean {
  const explicit = process.env.AFENDA_IAM_AUDIT_LOG?.trim()
  if (explicit === "1") return true
  if (explicit === "0") return false
  return process.env.VERCEL === "1"
}

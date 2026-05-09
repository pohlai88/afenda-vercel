/**
 * @packageDocumentation
 * 7W1H audit shape — structured for analytics, filters, and machine consumers.
 *
 * **Natural-rendering intent:** do not render the eight fields as a label-grid in
 * production UI. The sanctioned operator-facing path is {@link describeAuditEvent7W1H}.
 */

import { z } from "zod"

export const AUDIT_7W1H_MECHANISMS = [
  "server-action",
  "lynx-operator",
  "cron",
  "webhook",
  "workflow",
  "import",
  "system",
] as const

export type AuditEvent7W1HMechanism = (typeof AUDIT_7W1H_MECHANISMS)[number]

export type AuditEvent7W1H = {
  who: string
  what: string
  when: string
  where: string
  why: string
  which: string
  whom: string
  how: AuditEvent7W1HMechanism
  /** IAM audit action string — prefer {@link buildCrudSapAuditAction} from `./crud-sap.shared`. */
  action: string
}

const mechanismSchema = z.enum(AUDIT_7W1H_MECHANISMS)

/** Last dot segment of `action` — used to infer when `why` is mandatory. */
export function extractTrailingAuditVerb(action: string): string {
  const parts = action.split(".").filter((s) => s.length > 0)
  return parts[parts.length - 1] ?? ""
}

const auditEvent7W1HBaseSchema = z
  .object({
    who: z.string().trim().min(1).max(512),
    what: z.string().trim().min(1).max(2000),
    when: z.string().trim().min(1).max(64),
    where: z.string().trim().min(1).max(512),
    why: z.string().max(8000).default(""),
    which: z.string().trim().min(1).max(512),
    whom: z.string().trim().min(1).max(512),
    how: mechanismSchema,
    action: z
      .string()
      .trim()
      .min(3)
      .max(256)
      .refine((s) => !s.endsWith("."), {
        message: "action must not end with a dot",
      }),
  })
  .strict()

export const auditEvent7W1HSchema = auditEvent7W1HBaseSchema.superRefine(
  (val, ctx) => {
    const v = extractTrailingAuditVerb(val.action)
    if (v === "resolve" || v === "update" || v === "deprecate") {
      if (!val.why.trim()) {
        ctx.addIssue({
          code: "custom",
          message:
            "why is required when the trailing audit verb is resolve, update, or deprecate",
          path: ["why"],
        })
      }
    }
  }
)

function howToPhrase(how: AuditEvent7W1HMechanism): string {
  switch (how) {
    case "server-action":
      return "via a server action"
    case "lynx-operator":
      return "via Lynx"
    case "cron":
      return "via a scheduled job"
    case "webhook":
      return "via a webhook"
    case "workflow":
      return "via a workflow run"
    case "import":
      return "via an import"
    case "system":
      return "via the system"
    default: {
      const _exhaustive: never = how
      return _exhaustive
    }
  }
}

/** Compact relative time from ISO `when` when parseable; otherwise empty. */
export function formatRecordedRelative(isoWhen: string, nowMs: number): string {
  const t = Date.parse(isoWhen)
  if (Number.isNaN(t)) return ""
  const diffSec = Math.max(0, Math.floor((nowMs - t) / 1000))
  if (diffSec < 60) return "just now"
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60)
    return `${m} minute${m === 1 ? "" : "s"} ago`
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600)
    const m = Math.floor((diffSec % 3600) / 60)
    if (m === 0) return `${h} hour${h === 1 ? "" : "s"} ago`
    return `${h} hour${h === 1 ? "" : "s"} ${m} minute${m === 1 ? "" : "s"} ago`
  }
  const d = Math.floor(diffSec / 86400)
  return `${d} day${d === 1 ? "" : "s"} ago`
}

/**
 * Single calm sentence for operator UI — must not emit label tokens such as
 * `WHO:` or `WHEN:`.
 */
export function describeAuditEvent7W1H(
  event: AuditEvent7W1H,
  options?: { nowMs?: number }
): string {
  const nowMs = options?.nowMs ?? Date.now()
  const rel = formatRecordedRelative(event.when, nowMs)
  const timeClause = rel ? `Recorded ${rel}.` : ""
  const whyClause = event.why.trim()
    ? ` ${event.why.trim().endsWith(".") ? event.why.trim() : `${event.why.trim()}.`}`
    : ""
  const parts = [
    `In ${event.where.trim()}, ${event.who.trim()} ${event.what.trim().replace(/\.$/, "")}.`,
    timeClause,
    `This affects ${event.whom.trim()} (${event.which.trim()})${whyClause}`,
    `${howToPhrase(event.how)}.`,
  ]
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

export function trimAuditCache(
  cache: AuditEvent7W1H[] | null | undefined,
  next: AuditEvent7W1H,
  options?: { keep?: number }
): AuditEvent7W1H[] {
  const keep = options?.keep ?? 20
  const base = cache ?? []
  return [...base, next].slice(-keep)
}

import "server-only"

import { LYNX_NL_DEMO_ONETHING_TABLE } from "./nl-sql-demo-guard.shared"

export function buildLynxOneThingNlDemoGenerateSqlSystemPrompt(
  organizationId: string
): string {
  return `You are Lynx, Afenda's machine layer. Generate a single read-only SELECT for Postgres.

Table schema (single table — do not reference any other table):

"${LYNX_NL_DEMO_ONETHING_TABLE}" (
  "id" text PRIMARY KEY,
  "listId" text NOT NULL,
  "organizationId" text,
  "ownerUserId" text,
  "assigneeUserId" text,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "state" text NOT NULL,
  "priority" text NOT NULL,
  "dueAt" timestamp,
  "snoozeUntil" timestamp,
  "recurrenceRule" text,
  "parentOneThingId" text,
  "position" integer NOT NULL,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL
);

Hard rules:
- Only retrieval: produce a single SELECT statement.
- FROM must be exactly "${LYNX_NL_DEMO_ONETHING_TABLE}" with double-quoted identifier.
- EVERY query MUST include: "organizationId" = '${organizationId}'
- Do not use JOIN, semicolons, comments, or multiple statements.
- Org tasks use "organizationId"; ignore personal rows (they have "ownerUserId" set and null organizationId).

Useful filters: "state" IN ('pending','in_progress','completed','snoozed','cancelled'); "dueAt" for overdue comparisons.`
}

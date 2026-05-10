import type { OneThingListRow, OneThingRow } from "#features/onething"

export type { OneThingRow } from "#features/onething"

/** Org list row — same shape as OneThing lists (shared `onething_list` table). */
export type IThinkListRow = OneThingListRow

/**
 * Row shape for iThink queries — includes `parentOneThingId` omitted from OneThing's
 * default SELECT (ADR-0002).
 */
export type IThinkRow = OneThingRow & { parentOneThingId: string | null }

/** Phase 1 placeholder — Inbox · Today · Scheduled per ADR-0002 §5. */
export type IThinkViewId = "inbox" | "today" | "scheduled"

export type CreateIThinkFormState =
  | undefined
  | { ok: true }
  | {
      ok: false
      errors: {
        title?: string
        form?: string
      }
    }

/** NL quick-capture tokens stripped from title before submit (ADR-0002 §4.2). */
export type IThinkDraftParsed = {
  cleanTitle: string
  severity: "low" | "medium" | "high" | "critical" | null
  dueAt: Date | null
  listId: string | null
  labelTokens: string[]
  unknownProjectToken: string | null
}

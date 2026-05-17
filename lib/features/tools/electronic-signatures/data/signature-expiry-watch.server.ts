import "server-only"

import { and, eq, isNotNull, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmSignatureParty } from "#lib/db/schema"

import {
  expireSignatureParty,
  sendSignaturePartyReminder,
} from "./signature-request.mutations.server"
import { SIGNATURE_REMINDER_OFFSETS_MS } from "./signature-reminder.shared"

function remindersAlreadySent(
  sentAt: Date,
  lastReminderSentAt: Date | null
): number {
  if (!lastReminderSentAt) {
    return 0
  }
  let count = 0
  for (const offset of SIGNATURE_REMINDER_OFFSETS_MS) {
    if (lastReminderSentAt.getTime() >= sentAt.getTime() + offset) {
      count += 1
    }
  }
  return count
}

export type SignatureExpiryTickSummary = {
  readonly scanned: number
  readonly expired: number
}

export type SignatureReminderTickSummary = {
  readonly scanned: number
  readonly reminded: number
}

export async function runSignatureExpiryTick(): Promise<SignatureExpiryTickSummary> {
  const now = new Date()
  const candidates = await db
    .select({
      id: hrmSignatureParty.id,
      organizationId: hrmSignatureParty.organizationId,
    })
    .from(hrmSignatureParty)
    .where(
      and(
        eq(hrmSignatureParty.signingStatus, "not_signed"),
        eq(hrmSignatureParty.sendStatus, "sent"),
        isNotNull(hrmSignatureParty.expiresAt),
        lte(hrmSignatureParty.expiresAt, now)
      )
    )
    .limit(100)

  let expired = 0
  for (const row of candidates) {
    await expireSignatureParty({
      organizationId: row.organizationId,
      partyId: row.id,
    })
    expired += 1
  }

  return { scanned: candidates.length, expired }
}

export async function runSignatureReminderTick(): Promise<SignatureReminderTickSummary> {
  const now = new Date()
  const candidates = await db
    .select({
      id: hrmSignatureParty.id,
      organizationId: hrmSignatureParty.organizationId,
      sentAt: hrmSignatureParty.sentAt,
      lastReminderSentAt: hrmSignatureParty.lastReminderSentAt,
    })
    .from(hrmSignatureParty)
    .where(
      and(
        eq(hrmSignatureParty.signingStatus, "not_signed"),
        eq(hrmSignatureParty.sendStatus, "sent"),
        isNotNull(hrmSignatureParty.nextReminderAt),
        lte(hrmSignatureParty.nextReminderAt, now)
      )
    )
    .limit(100)

  let reminded = 0
  for (const row of candidates) {
    if (!row.sentAt) continue
    const reminderIndex = remindersAlreadySent(
      row.sentAt,
      row.lastReminderSentAt
    )

    await sendSignaturePartyReminder({
      organizationId: row.organizationId,
      partyId: row.id,
      reminderIndex,
    })
    reminded += 1
  }

  return { scanned: candidates.length, reminded }
}

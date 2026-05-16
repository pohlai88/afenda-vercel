import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { accountingJournalBatch } from "#lib/db/schema"

export type AccountingJournalBatchLineRow = {
  readonly lineNumber: number
  readonly accountCode: string
  readonly accountName: string
  readonly side: "debit" | "credit"
  readonly amount: string
  readonly source: string
}

export type AccountingJournalBatchRow = {
  readonly id: string
  readonly organizationId: string
  readonly sourceModule: string
  readonly sourceObject: string
  readonly sourceId: string
  readonly reference: string
  readonly currency: string
  readonly sourceHash: string
  readonly closeSnapshotHash: string
  readonly totalDebits: string
  readonly totalCredits: string
  readonly netBalance: string
  readonly journalLines: readonly AccountingJournalBatchLineRow[]
  readonly metadata: Record<string, unknown> | null
  readonly postedByUserId: string | null
  readonly postedAt: Date
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type AccountingJournalSourceKey = {
  readonly organizationId: string
  readonly sourceModule: string
  readonly sourceObject: string
  readonly sourceId: string
}

export type CreateAccountingJournalBatchInput = AccountingJournalSourceKey & {
  readonly reference: string
  readonly currency: string
  readonly sourceHash: string
  readonly closeSnapshotHash: string
  readonly totalDebits: string
  readonly totalCredits: string
  readonly netBalance: string
  readonly journalLines: readonly AccountingJournalBatchLineRow[]
  readonly metadata?: Record<string, unknown> | null
  readonly postedByUserId: string
}

function mapAccountingJournalBatchRow(
  row: typeof accountingJournalBatch.$inferSelect
): AccountingJournalBatchRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    sourceModule: row.sourceModule,
    sourceObject: row.sourceObject,
    sourceId: row.sourceId,
    reference: row.reference,
    currency: row.currency,
    sourceHash: row.sourceHash,
    closeSnapshotHash: row.closeSnapshotHash,
    totalDebits: row.totalDebits,
    totalCredits: row.totalCredits,
    netBalance: row.netBalance,
    journalLines: (row.journalLines ?? []) as AccountingJournalBatchLineRow[],
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    postedByUserId: row.postedByUserId,
    postedAt: row.postedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getAccountingJournalBatchBySource(
  input: AccountingJournalSourceKey
): Promise<AccountingJournalBatchRow | null> {
  const rows = await db
    .select()
    .from(accountingJournalBatch)
    .where(
      and(
        eq(accountingJournalBatch.organizationId, input.organizationId),
        eq(accountingJournalBatch.sourceModule, input.sourceModule),
        eq(accountingJournalBatch.sourceObject, input.sourceObject),
        eq(accountingJournalBatch.sourceId, input.sourceId)
      )
    )
    .limit(1)

  return rows[0] ? mapAccountingJournalBatchRow(rows[0]) : null
}

export async function createAccountingJournalBatch(
  input: CreateAccountingJournalBatchInput
): Promise<AccountingJournalBatchRow> {
  const now = new Date()
  const inserted = await db
    .insert(accountingJournalBatch)
    .values({
      organizationId: input.organizationId,
      sourceModule: input.sourceModule,
      sourceObject: input.sourceObject,
      sourceId: input.sourceId,
      reference: input.reference,
      currency: input.currency,
      sourceHash: input.sourceHash,
      closeSnapshotHash: input.closeSnapshotHash,
      totalDebits: input.totalDebits,
      totalCredits: input.totalCredits,
      netBalance: input.netBalance,
      journalLines: [...input.journalLines],
      metadata: input.metadata ?? null,
      postedByUserId: input.postedByUserId,
      postedAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [
        accountingJournalBatch.organizationId,
        accountingJournalBatch.sourceModule,
        accountingJournalBatch.sourceObject,
        accountingJournalBatch.sourceId,
      ],
    })
    .returning()

  if (inserted[0]) {
    return mapAccountingJournalBatchRow(inserted[0])
  }

  const existing = await getAccountingJournalBatchBySource(input)
  if (!existing) {
    throw new Error("accounting_journal_insert_conflict")
  }
  return existing
}

export async function listAccountingJournalBatchesForOrg(
  organizationId: string
): Promise<AccountingJournalBatchRow[]> {
  const rows = await db
    .select()
    .from(accountingJournalBatch)
    .where(eq(accountingJournalBatch.organizationId, organizationId))
    .orderBy(desc(accountingJournalBatch.postedAt))

  return rows.map(mapAccountingJournalBatchRow)
}

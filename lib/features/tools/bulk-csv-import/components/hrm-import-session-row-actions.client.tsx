"use client"

import type { HrmImportSessionListRow } from "../data/hrm-import.queries.server"

import { HrmImportRollbackButton } from "./hrm-import-rollback-button.client"
import { HrmImportSessionCommitRollback } from "./hrm-import-session-commit-rollback.client"

type HrmImportSessionRowActionsProps = {
  orgSlug: string
  session: HrmImportSessionListRow
}

export function HrmImportSessionRowActions({
  orgSlug,
  session,
}: HrmImportSessionRowActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {session.status === "dry_run" &&
      session.rollbackKind === "hrm_import_v1" &&
      !session.errorJson?.rows?.length &&
      session.rowCount > 0 ? (
        <HrmImportSessionCommitRollback
          orgSlug={orgSlug}
          sessionId={session.id}
          canCommit
        />
      ) : null}
      {session.status === "committed" ? (
        <HrmImportRollbackButton orgSlug={orgSlug} sessionId={session.id} />
      ) : null}
    </div>
  )
}

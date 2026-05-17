/** Canonical IAM audit strings for governed HRM CSV import sessions. */
export const HRM_BULK_IMPORT_AUDIT = {
  sessionDryRun: "erp.hrm.import.session.dry_run",
  sessionCommit: "erp.hrm.import.session.commit",
  sessionRollback: "erp.hrm.import.session.rollback",
} as const

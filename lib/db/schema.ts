import { sql } from "drizzle-orm"
import {
  boolean,
  date,
  decimal,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core"

/**
 * IAM / security audit trail (org-scoped where applicable).
 * Append-only; writers live in `lib/auth/audit.server.ts` and Neon Auth hooks. Action strings: see IAM audit policy in `AGENTS.md` (`erp.*`, `org.*`, `iam.session.*`).
 * FK references to user/organization are intentionally omitted — IDs come from `neon_auth.*` which is managed by Neon Auth and does not expose cross-schema FK constraints.
 */
export const iamAuditEvent = pgTable(
  "iam_audit_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    action: text("action").notNull(),
    actorUserId: text("actorUserId"),
    actorSessionId: text("actorSessionId"),
    organizationId: text("organizationId"),
    resourceType: text("resourceType"),
    resourceId: text("resourceId"),
    path: text("path"),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    /** JSON object serialized with `JSON.stringify` */
    metadata: text("metadata"),
    /**
     * Row provenance — `simulation` rows are authored only via operational simulation replay.
     * Compliance exports default to `production` only.
     */
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
    auditActorMode: text("auditActorMode").notNull().default("user"),
  },
  (t) => [
    index("iam_audit_event_organizationId_auditOrigin_createdAt_idx").on(
      t.organizationId,
      t.auditOrigin,
      t.createdAt
    ),
    index("iam_audit_event_organizationId_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("iam_audit_event_actorUserId_createdAt_idx").on(
      t.actorUserId,
      t.createdAt
    ),
    index("iam_audit_event_action_createdAt_idx").on(t.action, t.createdAt),
  ]
)

/** ERP sample domain — scoped by organization (organizationId from neon_auth.organization). */
export const customers = pgTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("customers_organization_id_idx").on(t.organizationId)]
)

/**
 * Outbound event delivery — endpoint configuration (per organization).
 * `signingKeyEncoded` stores the base64-encoded HMAC signing key. The
 * plaintext is shown only once at create/rotate (UI never re-renders it; the
 * column is intentionally never returned to the browser). `events` is a JSONB
 * array of canonical namespaced event types (see `ORG_ADMIN_EVENT_NAMESPACES`).
 * `signatureVersion` future-proofs the HMAC algorithm; bump on rotation.
 *
 * Encryption-at-rest (KMS / pgcrypto) is a follow-up; tracked in AGENTS.md
 * §5 → Organizational control plane.
 */
export const orgEventEndpoint = pgTable(
  "org_event_endpoint",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    signingKeyEncoded: text("signingKeyEncoded").notNull(),
    events: jsonb("events").$type<string[]>().notNull(),
    signatureVersion: text("signatureVersion").notNull().default("v1"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("org_event_endpoint_organization_id_idx").on(t.organizationId)]
)

/**
 * Outbound event delivery — per-attempt record with full audit lineage.
 * `payloadHash` is the sha-256 hex of canonical JSON (sorted keys) for the
 * delivered envelope, captured at enqueue time. `state` follows the canonical
 * lifecycle: queued | sending | delivered | failed | expired | disabled
 * (see `EVENT_DELIVERY_STATES` in `lib/features/org-admin/constants.ts`).
 */
export const orgEventDelivery = pgTable(
  "org_event_delivery",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    endpointId: text("endpointId")
      .notNull()
      .references(() => orgEventEndpoint.id, { onDelete: "cascade" }),
    eventType: text("eventType").notNull(),
    payloadHash: text("payloadHash").notNull(),
    signatureVersion: text("signatureVersion").notNull(),
    state: text("state").notNull(),
    attempts: integer("attempts").notNull().default(0),
    httpStatus: integer("httpStatus"),
    errorMessage: text("errorMessage"),
    durationMs: integer("durationMs"),
    nextAttemptAt: timestamp("nextAttemptAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completedAt", { mode: "date" }),
  },
  (t) => [
    index("org_event_delivery_endpointId_createdAt_idx").on(
      t.endpointId,
      t.createdAt
    ),
    index("org_event_delivery_state_createdAt_idx").on(t.state, t.createdAt),
  ]
)

/**
 * Organizational ingestion jobs — generic primitive used by adapters that
 * stage rows from external sources (CSV first; vendors / SKUs / contracts
 * later). One job → many rows → many failures. `inputDigest` (sha-256 hex of
 * canonical input) gives idempotency once enforcement lands. `metadata`
 * captures adapter-specific options (filename, original row count, …).
 */
export const importJob = pgTable(
  "import_job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    adapter: text("adapter").notNull(),
    state: text("state").notNull(),
    totalRows: integer("totalRows").notNull().default(0),
    successCount: integer("successCount").notNull().default(0),
    failureCount: integer("failureCount").notNull().default(0),
    inputDigest: text("inputDigest").notNull(),
    /** userId from neon_auth.user */
    createdByUserId: text("createdByUserId"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completedAt", { mode: "date" }),
  },
  (t) => [
    index("import_job_organization_id_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("import_job_state_idx").on(t.state),
  ]
)

/**
 * Staged input row for an `import_job`. `payload` is the parsed adapter row
 * (jsonb); `state` follows: pending → applied | failed | skipped. When the
 * adapter creates a downstream resource (invitation, contact, …) it captures
 * the `resourceType` / `resourceId` here for the governance ledger.
 */
export const importJobRow = pgTable(
  "import_job_row",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobId: text("jobId")
      .notNull()
      .references(() => importJob.id, { onDelete: "cascade" }),
    rowIndex: integer("rowIndex").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    state: text("state").notNull(),
    resourceType: text("resourceType"),
    resourceId: text("resourceId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("import_job_row_jobId_rowIndex_idx").on(t.jobId, t.rowIndex),
    index("import_job_row_jobId_state_idx").on(t.jobId, t.state),
  ]
)

/**
 * Failure detail for an `import_job_row` (or job-level when `rowId` is null).
 * `code` is a short stable string (e.g. `validation`, `rate_limit`,
 * `duplicate`). `field` optionally names the offending payload column.
 */
export const importJobFailure = pgTable(
  "import_job_failure",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobId: text("jobId")
      .notNull()
      .references(() => importJob.id, { onDelete: "cascade" }),
    rowId: text("rowId").references(() => importJobRow.id, {
      onDelete: "cascade",
    }),
    code: text("code").notNull(),
    message: text("message").notNull(),
    field: text("field"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("import_job_failure_jobId_createdAt_idx").on(t.jobId, t.createdAt),
  ]
)

/** Orbit attention primitive — operational pressure detected before it becomes executable work. */
export const plannerSignal = pgTable(
  "planner_signal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    title: text("title").notNull(),
    description: text("description"),
    signalClass: text("signalClass").notNull().default("manual_capture"),
    lifecycle: text("lifecycle").notNull().default("detected"),
    originatingSystem: text("originatingSystem"),
    correlationKey: text("correlationKey"),
    correlationGroup: text("correlationGroup"),
    urgency: integer("urgency").notNull().default(2),
    impact: integer("impact").notNull().default(2),
    severity: integer("severity").notNull().default(2),
    confidence: integer("confidence").notNull().default(3),
    effort: integer("effort").notNull().default(2),
    escalationLevel: integer("escalationLevel").notNull().default(1),
    temporalProximity: integer("temporalProximity").notNull().default(1),
    ownershipPressure: integer("ownershipPressure").notNull().default(1),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    detectedAt: timestamp("detectedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    promotedAt: timestamp("promotedAt", { mode: "date" }),
    expiresAt: timestamp("expiresAt", { mode: "date" }),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    auditOrigin: text("auditOrigin").notNull().default("production"),
  },
  (t) => [
    index("planner_signal_organization_lifecycle_idx").on(
      t.organizationId,
      t.lifecycle
    ),
    index("planner_signal_owner_lifecycle_idx").on(t.ownerUserId, t.lifecycle),
    index("planner_signal_detected_at_idx").on(t.detectedAt),
    index("planner_signal_correlation_key_idx").on(t.correlationKey),
  ]
)

/** Orbit execution primitive — durable operational work object. */
export const plannerItem = pgTable(
  "planner_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    sourceSignalId: text("sourceSignalId").references(() => plannerSignal.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    lifecycle: text("lifecycle").notNull().default("triaged"),
    urgency: integer("urgency").notNull().default(2),
    impact: integer("impact").notNull().default(2),
    severity: integer("severity").notNull().default(2),
    confidence: integer("confidence").notNull().default(3),
    effort: integer("effort").notNull().default(2),
    escalationLevel: integer("escalationLevel").notNull().default(1),
    temporalProximity: integer("temporalProximity").notNull().default(1),
    ownershipPressure: integer("ownershipPressure").notNull().default(1),
    scheduleStartAt: timestamp("scheduleStartAt", { mode: "date" }),
    dueAt: timestamp("dueAt", { mode: "date" }),
    endAt: timestamp("endAt", { mode: "date" }),
    blockedAt: timestamp("blockedAt", { mode: "date" }),
    verifiedAt: timestamp("verifiedAt", { mode: "date" }),
    resolvedAt: timestamp("resolvedAt", { mode: "date" }),
    cancelledAt: timestamp("cancelledAt", { mode: "date" }),
    deprecatedAt: timestamp("deprecatedAt", { mode: "date" }),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    auditOrigin: text("auditOrigin").notNull().default("production"),
  },
  (t) => [
    index("planner_item_organization_lifecycle_idx").on(
      t.organizationId,
      t.lifecycle
    ),
    index("planner_item_owner_lifecycle_idx").on(t.ownerUserId, t.lifecycle),
    index("planner_item_due_at_idx").on(t.dueAt),
    index("planner_item_schedule_start_at_idx").on(t.scheduleStartAt),
    index("planner_item_source_signal_id_idx").on(t.sourceSignalId),
  ]
)

export const plannerAssignment = pgTable(
  "planner_assignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    subjectUserId: text("subjectUserId"),
    subjectLabel: text("subjectLabel"),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_assignment_item_id_idx").on(t.itemId),
    index("planner_assignment_role_subject_idx").on(t.role, t.subjectUserId),
  ]
)

export const plannerSchedule = pgTable(
  "planner_schedule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    scheduledStartAt: timestamp("scheduledStartAt", { mode: "date" }),
    scheduledEndAt: timestamp("scheduledEndAt", { mode: "date" }),
    snoozedUntil: timestamp("snoozedUntil", { mode: "date" }),
    timeZone: text("timeZone"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_schedule_item_id_idx").on(t.itemId),
    index("planner_schedule_start_idx").on(t.scheduledStartAt),
  ]
)

export const plannerRelation = pgTable(
  "planner_relation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    relatedItemId: text("relatedItemId").references(() => plannerItem.id, {
      onDelete: "cascade",
    }),
    relatedSignalId: text("relatedSignalId").references(
      () => plannerSignal.id,
      {
        onDelete: "cascade",
      }
    ),
    relationType: text("relationType").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_relation_item_id_idx").on(t.itemId),
    index("planner_relation_related_item_id_idx").on(t.relatedItemId),
    index("planner_relation_related_signal_id_idx").on(t.relatedSignalId),
  ]
)

export const plannerLink = pgTable(
  "planner_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    itemId: text("itemId").references(() => plannerItem.id, {
      onDelete: "cascade",
    }),
    signalId: text("signalId").references(() => plannerSignal.id, {
      onDelete: "cascade",
    }),
    module: text("module").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    displayLabel: text("displayLabel").notNull(),
    href: text("href"),
    causalityReason: text("causalityReason"),
    temporalContext: jsonb("temporalContext"),
    auditContext: jsonb("auditContext"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_link_organization_idx").on(t.organizationId),
    index("planner_link_owner_idx").on(t.ownerUserId),
    index("planner_link_item_id_idx").on(t.itemId),
    index("planner_link_signal_id_idx").on(t.signalId),
    index("planner_link_module_entity_idx").on(
      t.module,
      t.entityType,
      t.entityId
    ),
  ]
)

export const plannerReminder = pgTable(
  "planner_reminder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    remindAt: timestamp("remindAt", { mode: "date" }).notNull(),
    status: text("status").notNull().default("pending"),
    snoozedUntil: timestamp("snoozedUntil", { mode: "date" }),
    deliveredAt: timestamp("deliveredAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_reminder_item_id_idx").on(t.itemId),
    index("planner_reminder_status_remind_at_idx").on(t.status, t.remindAt),
  ]
)

export const plannerRecurrence = pgTable(
  "planner_recurrence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    rrule: text("rrule").notNull(),
    timeZone: text("timeZone"),
    nextRunAt: timestamp("nextRunAt", { mode: "date" }),
    lastRunAt: timestamp("lastRunAt", { mode: "date" }),
    pausedAt: timestamp("pausedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_recurrence_item_id_idx").on(t.itemId),
    index("planner_recurrence_next_run_at_idx").on(t.nextRunAt),
  ]
)

export const plannerSession = pgTable(
  "planner_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    itemId: text("itemId").references(() => plannerItem.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("active"),
    summary: text("summary"),
    startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
    endedAt: timestamp("endedAt", { mode: "date" }),
    pausedAt: timestamp("pausedAt", { mode: "date" }),
    durationMinutes: integer("durationMinutes"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_session_organization_status_idx").on(
      t.organizationId,
      t.status
    ),
    index("planner_session_owner_status_idx").on(t.ownerUserId, t.status),
    index("planner_session_item_id_idx").on(t.itemId),
    index("planner_session_started_at_idx").on(t.startedAt),
  ]
)

export const plannerActivity = pgTable(
  "planner_activity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId").references(() => plannerItem.id, {
      onDelete: "cascade",
    }),
    signalId: text("signalId").references(() => plannerSignal.id, {
      onDelete: "cascade",
    }),
    activityType: text("activityType").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata"),
    authorUserId: text("authorUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_activity_item_id_created_at_idx").on(t.itemId, t.createdAt),
    index("planner_activity_signal_id_created_at_idx").on(
      t.signalId,
      t.createdAt
    ),
  ]
)

export const plannerComment = pgTable(
  "planner_comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    authorUserId: text("authorUserId").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("planner_comment_item_id_created_at_idx").on(t.itemId, t.createdAt),
  ]
)

export const plannerAttachment = pgTable(
  "planner_attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId")
      .notNull()
      .references(() => plannerItem.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    contentSha256: text("contentSha256").notNull(),
    mimeType: text("mimeType").notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("planner_attachment_item_id_idx").on(t.itemId)]
)

export const plannerView = pgTable(
  "planner_view",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    surface: text("surface").notNull(),
    filterState: jsonb("filterState"),
    sortMode: text("sortMode"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("planner_view_org_slug_uidx")
      .on(t.organizationId, t.slug)
      .where(sql`${t.organizationId} IS NOT NULL`),
    uniqueIndex("planner_view_owner_slug_uidx")
      .on(t.ownerUserId, t.slug)
      .where(sql`${t.ownerUserId} IS NOT NULL`),
  ]
)

export const plannerRankingSnapshot = pgTable(
  "planner_ranking_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId").references(() => plannerItem.id, {
      onDelete: "cascade",
    }),
    signalId: text("signalId").references(() => plannerSignal.id, {
      onDelete: "cascade",
    }),
    displayPriority: text("displayPriority").notNull(),
    pressureScore: integer("pressureScore").notNull(),
    dimensions: jsonb("dimensions"),
    snapshotAt: timestamp("snapshotAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("planner_ranking_snapshot_item_idx").on(t.itemId, t.snapshotAt),
    index("planner_ranking_snapshot_signal_idx").on(t.signalId, t.snapshotAt),
  ]
)

export const plannerPressureSnapshot = pgTable(
  "planner_pressure_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    summary: jsonb("summary"),
    snapshotAt: timestamp("snapshotAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("planner_pressure_snapshot_organization_idx").on(
      t.organizationId,
      t.snapshotAt
    ),
    index("planner_pressure_snapshot_owner_idx").on(
      t.ownerUserId,
      t.snapshotAt
    ),
  ]
)

/** Knowledge ingestion sources (`0010_knowledge_sources_and_evals.sql`). */
export const knowledgeSource = pgTable(
  "knowledge_source",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("knowledge_source_organization_id_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("knowledge_source_organization_id_enabled_idx").on(
      t.organizationId,
      t.enabled
    ),
  ]
)

export const knowledgeDocument = pgTable(
  "knowledge_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    sourceId: text("sourceId")
      .notNull()
      .references(() => knowledgeSource.id, { onDelete: "cascade" }),
    externalId: text("externalId").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    inputDigest: text("inputDigest").notNull(),
    tokenCount: integer("tokenCount").notNull().default(0),
    embeddingModelVersion: text("embeddingModelVersion"),
    lastEmbeddedAt: timestamp("lastEmbeddedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("knowledge_document_source_external_uidx").on(
      t.sourceId,
      t.externalId
    ),
    index("knowledge_document_organization_id_source_id_idx").on(
      t.organizationId,
      t.sourceId
    ),
    index("knowledge_document_organization_id_updatedAt_idx").on(
      t.organizationId,
      t.updatedAt
    ),
  ]
)

export const knowledgeOrgSetting = pgTable(
  "knowledge_org_setting",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    retrievalHybridEnabled: boolean("retrievalHybridEnabled")
      .notNull()
      .default(false),
    retrievalRerankEnabled: boolean("retrievalRerankEnabled")
      .notNull()
      .default(false),
    enforceZdr: boolean("enforceZdr").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("knowledge_org_setting_organization_uidx").on(t.organizationId),
  ]
)

export const knowledgeEvalSet = pgTable(
  "knowledge_eval_set",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("knowledge_eval_set_organization_id_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
  ]
)

export const knowledgeEvalCase = pgTable(
  "knowledge_eval_case",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    evalSetId: text("evalSetId")
      .notNull()
      .references(() => knowledgeEvalSet.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    expectedEvidenceIds: jsonb("expectedEvidenceIds")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    expectedAnswerSubstring: text("expectedAnswerSubstring"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("knowledge_eval_case_eval_set_id_created_at_idx").on(
      t.evalSetId,
      t.createdAt
    ),
  ]
)

export const knowledgeOrgCredential = pgTable(
  "knowledge_org_credential",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    provider: text("provider").notNull(),
    cipherText: text("cipherText").notNull(),
    cipherIv: text("cipherIv").notNull(),
    cipherTag: text("cipherTag").notNull(),
    keyVersion: integer("keyVersion").notNull().default(1),
    state: text("state").notNull().default("active"),
    enabled: boolean("enabled").notNull().default(true),
    lastRotatedAt: timestamp("lastRotatedAt", { mode: "date" }),
    lastUsedAt: timestamp("lastUsedAt", { mode: "date" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("knowledge_org_credential_org_provider_uidx").on(
      t.organizationId,
      t.provider
    ),
  ]
)

export const orgBotLink = pgTable(
  "org_bot_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    platform: text("platform").notNull(),
    externalWorkspaceId: text("externalWorkspaceId"),
    externalRepository: text("externalRepository"),
    externalInstallationId: text("externalInstallationId"),
    enabled: boolean("enabled").notNull().default(true),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    displayName: text("displayName"),
    lastTestedAt: timestamp("lastTestedAt", { mode: "date" }),
    lastTestStatus: text("lastTestStatus"),
    lastTestError: text("lastTestError"),
  },
  (t) => [
    index("org_bot_link_organization_id_platform_idx").on(
      t.organizationId,
      t.platform
    ),
  ]
)

export const knowledgeEvalRun = pgTable(
  "knowledge_eval_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    evalSetId: text("evalSetId")
      .notNull()
      .references(() => knowledgeEvalSet.id, { onDelete: "cascade" }),
    topK: integer("topK").notNull(),
    retrievalMode: text("retrievalMode").notNull(),
    totalCases: integer("totalCases").notNull().default(0),
    recallAtK: decimal("recallAtK", { precision: 5, scale: 4 }).notNull(),
    meanReciprocalRank: decimal("meanReciprocalRank", {
      precision: 5,
      scale: 4,
    }).notNull(),
    evidenceOverlap: decimal("evidenceOverlap", {
      precision: 5,
      scale: 4,
    }).notNull(),
    durationMs: integer("durationMs").notNull().default(0),
    createdByUserId: text("createdByUserId"),
    judgeModel: text("judgeModel"),
    judgeScore: decimal("judgeScore", { precision: 5, scale: 4 }),
    judgeMetadata: jsonb("judgeMetadata").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("knowledge_eval_run_organization_eval_set_createdAt_idx").on(
      t.organizationId,
      t.evalSetId,
      t.createdAt
    ),
  ]
)

/** Org-scoped knowledge chunks with pgvector embeddings (+ optional document lineage). */
export const knowledgeChunk = pgTable(
  "knowledge_chunk",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    documentId: text("documentId").references(() => knowledgeDocument.id, {
      onDelete: "set null",
    }),
    chunkIndex: integer("chunkIndex"),
    tokenCount: integer("tokenCount"),
    embeddingModelVersion: text("embeddingModelVersion"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
  },
  (t) => [
    index("knowledge_chunk_organization_id_idx").on(t.organizationId),
    index("knowledge_chunk_organization_document_idx").on(
      t.organizationId,
      t.documentId
    ),
    index("knowledge_chunk_embedding_hnsw").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
  ]
)

/** Append-only operator product feedback per organization (L1 utility bar). */
export const orgFeedbackEvent = pgTable(
  "org_feedback_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    organizationId: text("organizationId").notNull(),
    actorUserId: text("actorUserId").notNull(),
    category: text("category").notNull(),
    severity: text("severity").notNull().default("normal"),
    message: text("message").notNull(),
    path: text("path"),
    userAgent: text("userAgent"),
    metadata: text("metadata"),
    /** Inbox lifecycle: new → acknowledged → resolved | rejected */
    state: text("state").notNull().default("new"),
    acknowledgedByUserId: text("acknowledgedByUserId"),
    acknowledgedAt: timestamp("acknowledgedAt", { mode: "date" }),
    resolvedByUserId: text("resolvedByUserId"),
    resolvedAt: timestamp("resolvedAt", { mode: "date" }),
    resolutionNote: text("resolutionNote"),
  },
  (t) => [
    index("org_feedback_event_organizationId_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
    index("org_feedback_event_organizationId_state_createdAt_idx").on(
      t.organizationId,
      t.state,
      t.createdAt
    ),
    index("org_feedback_event_actorUserId_createdAt_idx").on(
      t.actorUserId,
      t.createdAt
    ),
  ]
)

/** Org-wide broadcast notice for the Nexus notifications center. */
export const orgNotificationNotice = pgTable(
  "org_notification_notice",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    source: text("source").notNull().default("admin"),
    createdByUserId: text("createdByUserId"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    severity: text("severity").notNull().default("info"),
    targetUserId: text("targetUserId"),
    linkedEntityType: text("linkedEntityType"),
    linkedEntityId: text("linkedEntityId"),
    linkedEntityLabel: text("linkedEntityLabel"),
    linkedPath: text("linkedPath"),
    publishedAt: timestamp("publishedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expiresAt", { mode: "date" }),
    closedAt: timestamp("closedAt", { mode: "date" }),
    closedByUserId: text("closedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("org_notification_notice_organization_publishedAt_idx").on(
      t.organizationId,
      t.publishedAt
    ),
    index("org_notification_notice_organization_closedAt_idx").on(
      t.organizationId,
      t.closedAt
    ),
    index("org_notification_notice_targetUser_publishedAt_idx").on(
      t.organizationId,
      t.targetUserId,
      t.publishedAt
    ),
    index("org_notification_notice_linkedEntity_idx").on(
      t.organizationId,
      t.linkedEntityType,
      t.linkedEntityId
    ),
  ]
)

/** Per-operator read and acknowledgement state for org notifications. */
export const orgNotificationReceipt = pgTable(
  "org_notification_receipt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    noticeId: text("noticeId")
      .notNull()
      .references(() => orgNotificationNotice.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),
    readAt: timestamp("readAt", { mode: "date" }),
    acknowledgedAt: timestamp("acknowledgedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_notification_receipt_notice_user_uidx").on(
      t.noticeId,
      t.userId
    ),
    index("org_notification_receipt_user_createdAt_idx").on(
      t.userId,
      t.createdAt
    ),
  ]
)

/** Operational coordination context — org-scoped discussion attached to work. */
export const orgCoordinationContext = pgTable(
  "org_coordination_context",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    createdByUserId: text("createdByUserId").notNull(),
    subject: text("subject"),
    linkedEntityType: text("linkedEntityType"),
    linkedEntityId: text("linkedEntityId"),
    linkedEntityLabel: text("linkedEntityLabel"),
    linkedEntityPath: text("linkedEntityPath"),
    lastActivityAt: timestamp("lastActivityAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("org_coordination_context_organization_lastActivityAt_idx").on(
      t.organizationId,
      t.lastActivityAt
    ),
    index("org_coordination_context_createdByUserId_createdAt_idx").on(
      t.createdByUserId,
      t.createdAt
    ),
    index("org_coordination_context_linkedEntity_idx").on(
      t.organizationId,
      t.linkedEntityType,
      t.linkedEntityId
    ),
  ]
)

/** Per-operator membership + unread/read state for an org coordination context. */
export const orgCoordinationOperator = pgTable(
  "org_coordination_operator",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextId: text("contextId")
      .notNull()
      .references(() => orgCoordinationContext.id, { onDelete: "cascade" }),
    userId: text("userId").notNull(),
    joinedAt: timestamp("joinedAt", { mode: "date" }).notNull().defaultNow(),
    lastReadAt: timestamp("lastReadAt", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("org_coordination_operator_context_user_uidx").on(
      t.contextId,
      t.userId
    ),
    index("org_coordination_operator_user_joinedAt_idx").on(
      t.userId,
      t.joinedAt
    ),
  ]
)

/** Activity stream for a coordination context — comments, evidence, and status notes. */
export const orgCoordinationActivity = pgTable(
  "org_coordination_activity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextId: text("contextId")
      .notNull()
      .references(() => orgCoordinationContext.id, { onDelete: "cascade" }),
    organizationId: text("organizationId").notNull(),
    authorUserId: text("authorUserId").notNull(),
    kind: text("kind").notNull().default("comment"),
    body: text("body").notNull().default(""),
    evidence: jsonb("evidence")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("org_coordination_activity_contextId_createdAt_idx").on(
      t.contextId,
      t.createdAt
    ),
    index("org_coordination_activity_organizationId_createdAt_idx").on(
      t.organizationId,
      t.createdAt
    ),
  ]
)

/**
 * Demo dataset for Lynx **natural language → SQL** (Vercel Labs pattern).
 * Org-scoped only; guarded execution allowlists this table in `nl-sql-demo-guard`.
 */
export const lynxDemoUnicorn = pgTable(
  "lynx_demo_unicorn",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    company: text("company").notNull(),
    valuation: decimal("valuation", { precision: 10, scale: 2 }).notNull(),
    dateJoined: date("dateJoined", { mode: "date" }),
    country: text("country").notNull(),
    city: text("city").notNull(),
    industry: text("industry").notNull(),
    selectInvestors: text("selectInvestors").notNull(),
  },
  (t) => [
    index("lynx_demo_unicorn_organization_id_idx").on(t.organizationId),
    uniqueIndex("lynx_demo_unicorn_org_company_uidx").on(
      t.organizationId,
      t.company
    ),
  ]
)

/** Job grade ladder — Phase 1A workforce scaffolding (`erp.hrm.*` mutations ship in later slices for catalog CRUD). */
export const hrmJobGrade = pgTable(
  "hrm_job_grade",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ordinal: integer("ordinal").notNull().default(0),
    minSalaryAmount: decimal("minSalaryAmount", { precision: 15, scale: 2 }),
    maxSalaryAmount: decimal("maxSalaryAmount", { precision: 15, scale: 2 }),
    currency: text("currency").notNull().default("MYR"),
    benefitTierCode: text("benefitTierCode"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_job_grade_organizationId_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_job_grade_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
  ]
)

/** Department tree — `headEmployeeId` intentionally has no FK until workforce graph is fully wired (avoids circular DDL). */
export const hrmDepartment = pgTable(
  "hrm_department",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    parentDepartmentId: text("parentDepartmentId"),
    headEmployeeId: text("headEmployeeId"),
    costCenterCode: text("costCenterCode"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    foreignKey({
      columns: [t.parentDepartmentId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    uniqueIndex("hrm_department_organizationId_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_department_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
  ]
)

export const hrmPosition = pgTable(
  "hrm_position",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    departmentId: text("departmentId")
      .notNull()
      .references(() => hrmDepartment.id),
    defaultGradeId: text("defaultGradeId").references(() => hrmJobGrade.id),
    reportsToPositionId: text("reportsToPositionId"),
    employmentType: text("employmentType").notNull().default("permanent"),
    headcountBudget: integer("headcountBudget"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    foreignKey({
      columns: [t.reportsToPositionId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    uniqueIndex("hrm_position_organizationId_code_uidx").on(
      t.organizationId,
      t.code
    ),
    index("hrm_position_organizationId_departmentId_idx").on(
      t.organizationId,
      t.departmentId
    ),
    index("hrm_position_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
  ]
)

/**
 * Workforce master — Phase 1A CRUD surface (contracts / payroll profile / documents ship in 1B).
 * PII columns exist for operational truth; never copy raw identifiers into IAM audit `metadata`.
 */
export const hrmEmployee = pgTable(
  "hrm_employee",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeNumber: text("employeeNumber").notNull(),
    legalName: text("legalName").notNull(),
    preferredName: text("preferredName"),
    dateOfBirth: date("dateOfBirth", { mode: "date" }),
    gender: text("gender"),
    nationality: text("nationality"),
    idDocumentType: text("idDocumentType"),
    idDocumentNumber: text("idDocumentNumber"),
    email: text("email"),
    phone: text("phone"),
    address: jsonb("address"),
    countryCode: text("countryCode"),
    workStateCode: text("workStateCode"),
    linkedUserId: text("linkedUserId"),
    currentDepartmentId: text("currentDepartmentId").references(
      () => hrmDepartment.id
    ),
    currentPositionId: text("currentPositionId").references(
      () => hrmPosition.id
    ),
    currentJobGradeId: text("currentJobGradeId").references(
      () => hrmJobGrade.id
    ),
    managerEmployeeId: text("managerEmployeeId"),
    /** Cached pointer — updated with {@link hrmEmploymentContract} activation (same transaction). No Drizzle FK (avoids circular init); enforced in SQL migration. */
    currentEmploymentContractId: text("currentEmploymentContractId"),
    audit7w1h: jsonb("audit7w1h"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    archivedByUserId: text("archivedByUserId"),
    archivedReason: text("archivedReason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
  },
  (t) => [
    foreignKey({
      columns: [t.managerEmployeeId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    uniqueIndex("hrm_employee_organizationId_employeeNumber_uidx").on(
      t.organizationId,
      t.employeeNumber
    ),
    index("hrm_employee_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
    index("hrm_employee_organizationId_email_idx").on(
      t.organizationId,
      t.email
    ),
    index("hrm_employee_organizationId_currentDepartmentId_idx").on(
      t.organizationId,
      t.currentDepartmentId
    ),
    index("hrm_employee_organizationId_managerEmployeeId_idx").on(
      t.organizationId,
      t.managerEmployeeId
    ),
  ]
)

/** HR document vault — Blob URL + payload hash (Phase 1B). */
export const hrmDocument = pgTable(
  "hrm_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId").references(() => hrmEmployee.id, {
      onDelete: "set null",
    }),
    documentType: text("documentType").notNull(),
    subjectKind: text("subjectKind"),
    subjectId: text("subjectId"),
    title: text("title").notNull(),
    blobUrl: text("blobUrl").notNull(),
    payloadHash: text("payloadHash").notNull(),
    mimeType: text("mimeType").notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    classification: text("classification").notNull().default("internal"),
    retentionPolicyCode: text("retentionPolicyCode"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    signedByUserId: text("signedByUserId"),
    signedAt: timestamp("signedAt", { mode: "date" }),
    replacedByDocumentId: text("replacedByDocumentId"),
    uploadedByUserId: text("uploadedByUserId"),
    uploadedAt: timestamp("uploadedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.replacedByDocumentId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    index("hrm_document_organizationId_employeeId_documentType_idx").on(
      t.organizationId,
      t.employeeId,
      t.documentType
    ),
    index("hrm_document_organizationId_subjectKind_subjectId_idx").on(
      t.organizationId,
      t.subjectKind,
      t.subjectId
    ),
    index("hrm_document_organizationId_effectiveTo_idx").on(
      t.organizationId,
      t.effectiveTo
    ),
  ]
)

/** Versioned employment relationship — Phase 1B (draft → signed doc → activate). */
export const hrmEmploymentContract = pgTable(
  "hrm_employment_contract",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    versionNumber: integer("versionNumber").notNull(),
    contractType: text("contractType").notNull(),
    state: text("state").notNull(),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    probationEndDate: date("probationEndDate", { mode: "date" }),
    confirmationDate: date("confirmationDate", { mode: "date" }),
    terminationDate: date("terminationDate", { mode: "date" }),
    terminationReason: text("terminationReason"),
    terminationNoticeDays: integer("terminationNoticeDays"),
    /** Optional checklist progress for onboarding/offboarding milestones (JSON). */
    onboardingChecklist: jsonb("onboardingChecklist"),
    positionId: text("positionId").references(() => hrmPosition.id, {
      onDelete: "set null",
    }),
    departmentId: text("departmentId").references(() => hrmDepartment.id, {
      onDelete: "set null",
    }),
    jobGradeId: text("jobGradeId").references(() => hrmJobGrade.id, {
      onDelete: "set null",
    }),
    workingPatternId: text("workingPatternId"),
    baseSalaryAmount: decimal("baseSalaryAmount", { precision: 15, scale: 2 }),
    baseSalaryCurrency: text("baseSalaryCurrency").notNull().default("MYR"),
    payFrequency: text("payFrequency").notNull().default("monthly"),
    normalWorkingHoursPerWeek: decimal("normalWorkingHoursPerWeek", {
      precision: 5,
      scale: 2,
    }),
    signedDocumentId: text("signedDocumentId").references(
      () => hrmDocument.id,
      {
        onDelete: "set null",
      }
    ),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    predictions: jsonb("predictions"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
  },
  (t) => [
    uniqueIndex(
      "hrm_employment_contract_organizationId_employeeId_version_uidx"
    ).on(t.organizationId, t.employeeId, t.versionNumber),
    uniqueIndex("hrm_employment_contract_org_employee_active_uidx")
      .on(t.organizationId, t.employeeId)
      .where(sql`${t.state} = 'active'`),
    index(
      "hrm_employment_contract_organizationId_employeeId_effectiveFrom_idx"
    ).on(t.organizationId, t.employeeId, t.effectiveFrom),
    index("hrm_employment_contract_organizationId_state_idx").on(
      t.organizationId,
      t.state
    ),
  ]
)

/** Performance review cycle (org-scoped). */
export const hrmReviewCycle = pgTable(
  "hrm_review_cycle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    periodStart: date("periodStart", { mode: "date" }).notNull(),
    periodEnd: date("periodEnd", { mode: "date" }).notNull(),
    state: text("state").notNull().default("draft"),
    /** `single` = one reviewer submit; `three_stage` = self → manager → HR before final submit. */
    reviewPipeline: text("reviewPipeline").notNull().default("single"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [index("hrm_review_cycle_organizationId_idx").on(t.organizationId)]
)

/** Individual performance review row within a cycle. */
export const hrmReview = pgTable(
  "hrm_review",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    cycleId: text("cycleId")
      .notNull()
      .references(() => hrmReviewCycle.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    reviewerId: text("reviewerId").notNull(),
    state: text("state").notNull().default("pending"),
    rating: text("rating"),
    notes: text("notes"),
    selfRating: text("selfRating"),
    selfNotes: text("selfNotes"),
    selfSubmittedAt: timestamp("selfSubmittedAt", { mode: "date" }),
    managerRating: text("managerRating"),
    managerNotes: text("managerNotes"),
    managerSubmittedAt: timestamp("managerSubmittedAt", { mode: "date" }),
    hrRating: text("hrRating"),
    hrNotes: text("hrNotes"),
    hrSubmittedAt: timestamp("hrSubmittedAt", { mode: "date" }),
    /** e.g. text | stars_5 — governs UI copy for staged reviews. */
    ratingScale: text("ratingScale").notNull().default("text"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_review_cycleId_employeeId_uidx").on(
      t.cycleId,
      t.employeeId
    ),
    index("hrm_review_organizationId_cycleId_idx").on(
      t.organizationId,
      t.cycleId
    ),
  ]
)

/** Employee dependents — payroll tax context + HR records (Viet-ERP parity slice). */
export const hrmDependent = pgTable(
  "hrm_dependent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    legalName: text("legalName").notNull(),
    relationship: text("relationship").notNull(),
    dateOfBirth: date("dateOfBirth", { mode: "date" }),
    taxDependent: boolean("taxDependent").notNull().default(false),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_dependent_organizationId_employeeId_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_dependent_organizationId_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
  ]
)

/** Field-level employee edits — complements IAM audit (structured diff). */
export const hrmEmployeeChangeHistory = pgTable(
  "hrm_employee_change_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "cascade" }),
    fieldName: text("fieldName").notNull(),
    oldValue: jsonb("oldValue"),
    newValue: jsonb("newValue"),
    changedByUserId: text("changedByUserId").notNull(),
    changedAt: timestamp("changedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_employee_change_history_org_employee_changedAt_idx").on(
      t.organizationId,
      t.employeeId,
      t.changedAt
    ),
  ]
)

/** KPI planning period (org-scoped). */
export const hrmKpiPeriod = pgTable(
  "hrm_kpi_period",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    periodStart: date("periodStart", { mode: "date" }).notNull(),
    periodEnd: date("periodEnd", { mode: "date" }).notNull(),
    state: text("state").notNull().default("draft"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [index("hrm_kpi_period_organizationId_idx").on(t.organizationId)]
)

/** KPI score per employee + metric within a period. */
export const hrmKpiScore = pgTable(
  "hrm_kpi_score",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    periodId: text("periodId")
      .notNull()
      .references(() => hrmKpiPeriod.id, { onDelete: "cascade" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    metricCode: text("metricCode").notNull(),
    targetValue: text("targetValue"),
    achievedValue: text("achievedValue"),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_kpi_score_org_period_employee_metric_uidx").on(
      t.organizationId,
      t.periodId,
      t.employeeId,
      t.metricCode
    ),
    index("hrm_kpi_score_organizationId_periodId_idx").on(
      t.organizationId,
      t.periodId
    ),
  ]
)

/** Salary advance — repaid via payroll deduction line on period lock. */
export const hrmSalaryAdvance = pgTable(
  "hrm_salary_advance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("MYR"),
    reason: text("reason"),
    state: text("state").notNull().default("pending"),
    requestedByUserId: text("requestedByUserId").notNull(),
    requestedAt: timestamp("requestedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    decidedByUserId: text("decidedByUserId"),
    decidedAt: timestamp("decidedAt", { mode: "date" }),
    decisionNote: text("decisionNote"),
    repaidAt: timestamp("repaidAt", { mode: "date" }),
    repaidByPayrollLineId: text("repaidByPayrollLineId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_salary_advance_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_salary_advance_org_state_idx").on(t.organizationId, t.state),
  ]
)

/**
 * Leave type catalog — org-scoped with Malaysia EA 2023 tier columns (Phase 2A).
 * accrualMethod: 'annual_grant' | 'monthly_accrual' | 'fixed_grant'
 * Three-tier EA shape: tier1Days/tier1MaxYears, tier2Days/tier2MaxYears, tier3Days.
 * Fixed types (hospital, maternity, paternity): use fixedDaysPerYear only.
 */
export const hrmLeaveType = pgTable(
  "hrm_leave_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    accrualMethod: text("accrualMethod").notNull().default("annual_grant"),
    paid: boolean("paid").notNull().default(true),
    genderRestriction: text("genderRestriction"),
    tier1Days: integer("tier1Days"),
    tier1MaxYears: integer("tier1MaxYears"),
    tier2Days: integer("tier2Days"),
    tier2MaxYears: integer("tier2MaxYears"),
    tier3Days: integer("tier3Days"),
    fixedDaysPerYear: integer("fixedDaysPerYear"),
    maxCarryForwardDays: integer("maxCarryForwardDays").notNull().default(0),
    carryForwardExpiryMonths: integer("carryForwardExpiryMonths"),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_leave_type_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_leave_type_org_archivedAt_idx").on(
      t.organizationId,
      t.archivedAt
    ),
  ]
)

/**
 * Effective-dated policy overlay per leave type — org-scoped, admin-gated (Phase 2A).
 * policyVersion is snapshotted onto hrm_leave_entitlement so past computations
 * are not silently mutated when the policy changes.
 */
export const hrmLeavePolicy = pgTable(
  "hrm_leave_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    leaveTypeId: text("leaveTypeId")
      .notNull()
      .references(() => hrmLeaveType.id, { onDelete: "restrict" }),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    isActive: boolean("isActive").notNull().default(true),
    overrideTier1Days: integer("overrideTier1Days"),
    overrideTier2Days: integer("overrideTier2Days"),
    overrideTier3Days: integer("overrideTier3Days"),
    overrideFixedDays: integer("overrideFixedDays"),
    overrideMaxCarryForward: integer("overrideMaxCarryForward"),
    notes: text("notes"),
    policyVersion: text("policyVersion").notNull().default("custom"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_leave_policy_org_leaveTypeId_idx").on(
      t.organizationId,
      t.leaveTypeId
    ),
    index("hrm_leave_policy_org_effectiveFrom_idx").on(
      t.organizationId,
      t.effectiveFrom
    ),
  ]
)

/**
 * Computed annual leave entitlement per employee (Phase 2A).
 * Written by leave-entitlement-engine; read by leave request actions (Phase 2B).
 * Unique per (org, employee, leave type, year) so the engine can upsert safely.
 * engineInputSnapshot preserves the computation inputs for traceability.
 */
export const hrmLeaveEntitlement = pgTable(
  "hrm_leave_entitlement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    leaveTypeId: text("leaveTypeId")
      .notNull()
      .references(() => hrmLeaveType.id, { onDelete: "restrict" }),
    leavePolicyId: text("leavePolicyId").references(() => hrmLeavePolicy.id, {
      onDelete: "set null",
    }),
    entitlementYear: integer("entitlementYear").notNull(),
    daysGranted: decimal("daysGranted", { precision: 6, scale: 2 }).notNull(),
    daysProrated: decimal("daysProrated", { precision: 6, scale: 2 }).notNull(),
    yearsOfServiceAtGrant: decimal("yearsOfServiceAtGrant", {
      precision: 5,
      scale: 2,
    }),
    prorataNumerator: integer("prorataNumerator").notNull().default(12),
    prorataDenominator: integer("prorataDenominator").notNull().default(12),
    basis: text("basis").notNull(),
    engineVersion: text("engineVersion").notNull(),
    engineInputSnapshot: jsonb("engineInputSnapshot"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_leave_entitlement_org_employee_type_year_uidx").on(
      t.organizationId,
      t.employeeId,
      t.leaveTypeId,
      t.entitlementYear
    ),
    index("hrm_leave_entitlement_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_leave_entitlement_org_year_idx").on(
      t.organizationId,
      t.entitlementYear
    ),
  ]
)

// ---------------------------------------------------------------------------
// Phase 2B — leave request, approval, balance
// ---------------------------------------------------------------------------

/**
 * Generic single-step HR approval record (Phase 2B).
 * subject_kind + subject_id discriminates the domain (leave_request | claim | …).
 * snapshot is immutable — approvers decide on what they saw, not a mutable live record.
 * Deferred: routeCode, routeVersion, currentStep, totalSteps, currentRunId (multi-step only).
 */
export const hrmApproval = pgTable(
  "hrm_approval",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    subjectKind: text("subjectKind").notNull(),
    subjectId: text("subjectId").notNull(),
    state: text("state").notNull().default("pending"),
    requestedByUserId: text("requestedByUserId").notNull(),
    requestedAt: timestamp("requestedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    currentApproverUserId: text("currentApproverUserId"),
    decisionByUserId: text("decisionByUserId"),
    decisionAt: timestamp("decisionAt", { mode: "date" }),
    decisionNote: text("decisionNote"),
    snapshot: jsonb("snapshot").notNull().default({}),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_approval_org_state_approver_idx").on(
      t.organizationId,
      t.state,
      t.currentApproverUserId
    ),
    index("hrm_approval_org_subject_idx").on(
      t.organizationId,
      t.subjectKind,
      t.subjectId
    ),
  ]
)

/**
 * Leave application state machine (Phase 2B).
 * states: draft → submitted → approved | rejected; approved → taken | cancelled.
 * current_approval_run_id: reserved for Workflow DevKit (Phase 3+) — nullable.
 */
export const hrmLeaveRequest = pgTable(
  "hrm_leave_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    leaveTypeId: text("leaveTypeId")
      .notNull()
      .references(() => hrmLeaveType.id, { onDelete: "restrict" }),
    requestedAt: timestamp("requestedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    startDate: date("startDate", { mode: "string" }).notNull(),
    endDate: date("endDate", { mode: "string" }).notNull(),
    durationDays: decimal("durationDays", { precision: 5, scale: 2 }).notNull(),
    halfDay: text("halfDay").notNull().default("none"),
    reason: text("reason"),
    evidenceDocumentId: text("evidenceDocumentId"),
    state: text("state").notNull().default("submitted"),
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
    currentApprovalRunId: text("currentApprovalRunId"),
    approvedByUserId: text("approvedByUserId"),
    approvedAt: timestamp("approvedAt", { mode: "date" }),
    rejectedReason: text("rejectedReason"),
    policyVersion: text("policyVersion"),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_leave_request_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_leave_request_org_state_start_idx").on(
      t.organizationId,
      t.state,
      t.startDate
    ),
    index("hrm_leave_request_org_leave_type_idx").on(
      t.organizationId,
      t.leaveTypeId
    ),
  ]
)

/**
 * Denormalised leave balance cache per (employee, leave type, year) (Phase 2B).
 * formula: available = opening + entitled + adjusted + carried_forward − taken − pending.
 * Recomputed from scratch on every leave request state change — idempotent.
 */
export const hrmLeaveBalance = pgTable(
  "hrm_leave_balance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    leaveTypeId: text("leaveTypeId")
      .notNull()
      .references(() => hrmLeaveType.id, { onDelete: "restrict" }),
    entitlementYear: integer("entitlementYear").notNull(),
    daysEntitled: decimal("daysEntitled", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    daysTaken: decimal("daysTaken", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    daysPending: decimal("daysPending", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    openingDays: decimal("openingDays", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    adjustedDays: decimal("adjustedDays", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    carriedForwardDays: decimal("carriedForwardDays", {
      precision: 6,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lastRecomputedAt: timestamp("lastRecomputedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_leave_balance_unique_idx").on(
      t.organizationId,
      t.employeeId,
      t.leaveTypeId,
      t.entitlementYear
    ),
    index("hrm_leave_balance_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
  ]
)

/** Statutory payroll identifiers — effective-dated rows (Phase 1B). */
export const hrmPayrollProfile = pgTable(
  "hrm_payroll_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    countryCode: text("countryCode").notNull().default("MY"),
    taxResidencyCountry: text("taxResidencyCountry"),
    taxIdentifierType: text("taxIdentifierType"),
    taxIdentifierNumber: text("taxIdentifierNumber"),
    epfNumber: text("epfNumber"),
    socsoNumber: text("socsoNumber"),
    eisEligible: boolean("eisEligible").notNull().default(true),
    pcbCategory: text("pcbCategory"),
    hrdfApplicable: boolean("hrdfApplicable").notNull().default(false),
    bankCode: text("bankCode"),
    bankAccountTokenized: text("bankAccountTokenized"),
    bankAccountHolderName: text("bankAccountHolderName"),
    paySchedule: text("paySchedule").notNull().default("monthly"),
    payCurrency: text("payCurrency").notNull().default("MYR"),
    payrollGroupCode: text("payrollGroupCode"),
    effectiveFrom: date("effectiveFrom", { mode: "date" }).notNull(),
    effectiveTo: date("effectiveTo", { mode: "date" }),
    statutoryProfileExtras: jsonb("statutoryProfileExtras"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
  },
  (t) => [
    uniqueIndex("hrm_payroll_profile_org_employee_current_uidx")
      .on(t.organizationId, t.employeeId)
      .where(sql`${t.effectiveTo} IS NULL`),
    index("hrm_payroll_profile_organizationId_employeeId_effectiveFrom_idx").on(
      t.organizationId,
      t.employeeId,
      t.effectiveFrom
    ),
  ]
)

// ---------------------------------------------------------------------------
// Phase 2C: Attendance event stream + daily aggregate
// ---------------------------------------------------------------------------

/** Immutable raw attendance event stream. Corrections create new rows (never update). */
export const hrmAttendanceEvent = pgTable(
  "hrm_attendance_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    /** clock_in | clock_out | break_start | break_end | correction */
    eventType: text("eventType").notNull(),
    occurredAt: timestamp("occurredAt", { mode: "date" }).notNull(),
    /** manual | csv_import | mobile | device */
    source: text("source").notNull(),
    /** import_job_row.id or device receipt */
    sourceRef: text("sourceRef"),
    /** Self-FK; set when eventType = 'correction'. Never updated on the original row. */
    correctionOfEventId: text("correctionOfEventId"),
    correctionReason: text("correctionReason"),
    latitude: decimal("latitude", { precision: 10, scale: 6 }),
    longitude: decimal("longitude", { precision: 10, scale: 6 }),
    deviceId: text("deviceId"),
    /** FK-style reference to import_job.id */
    importBatchId: text("importBatchId"),
    rawPayloadHash: text("rawPayloadHash"),
    metadata: jsonb("metadata"),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_attendance_event_org_emp_occurredAt_idx").on(
      t.organizationId,
      t.employeeId,
      t.occurredAt
    ),
    index("hrm_attendance_event_org_source_batchId_idx").on(
      t.organizationId,
      t.source,
      t.importBatchId
    ),
    index("hrm_attendance_event_org_correctionOf_idx").on(
      t.organizationId,
      t.correctionOfEventId
    ),
  ]
)

/** Computed daily attendance summary — rebuildable from raw events via `attendance-aggregator.server.ts`. */
export const hrmAttendanceDay = pgTable(
  "hrm_attendance_day",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    attendanceDate: date("attendanceDate").notNull(),
    firstClockInAt: timestamp("firstClockInAt", { mode: "date" }),
    lastClockOutAt: timestamp("lastClockOutAt", { mode: "date" }),
    scheduledMinutes: integer("scheduledMinutes").notNull().default(0),
    workedMinutes: integer("workedMinutes").notNull().default(0),
    breakMinutes: integer("breakMinutes").notNull().default(0),
    lateMinutes: integer("lateMinutes").notNull().default(0),
    earlyOutMinutes: integer("earlyOutMinutes").notNull().default(0),
    overtimeMinutes: integer("overtimeMinutes").notNull().default(0),
    /** Absence code from the leave engine (e.g. "annual", "sick"). */
    absenceCode: text("absenceCode"),
    /** open | computed | locked */
    state: text("state").notNull().default("open"),
    /** FK-style to hrm_payroll_period — set when the day is locked for payroll. */
    lockedByPayrollPeriodId: text("lockedByPayrollPeriodId"),
    /** SHA-256 of sorted contributing event IDs — used for idempotent re-aggregation. */
    derivedFromEventChecksum: text("derivedFromEventChecksum"),
    /** Full snapshot preserved for payroll evidence. */
    calculationSnapshot: jsonb("calculationSnapshot"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_attendance_day_org_emp_date_uidx").on(
      t.organizationId,
      t.employeeId,
      t.attendanceDate
    ),
    index("hrm_attendance_day_org_date_state_idx").on(
      t.organizationId,
      t.attendanceDate,
      t.state
    ),
  ]
)

// ---------------------------------------------------------------------------
// Phase 3A — Payroll preparation
// ---------------------------------------------------------------------------

/** Monthly payroll cycle envelope. Snapshots rulePackVersion at lock so past periods
 *  recompute identically. State machine: open → preparing → locked → finalized → posted.
 */
export const hrmPayrollPeriod = pgTable(
  "hrm_payroll_period",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** ISO date string "YYYY-MM-DD" — first day of the pay period. */
    periodStart: date("periodStart").notNull(),
    /** ISO date string "YYYY-MM-DD" — last day of the pay period. */
    periodEnd: date("periodEnd").notNull(),
    /** ISO date string "YYYY-MM-DD" — intended payment date. */
    paymentDate: date("paymentDate").notNull(),
    currency: text("currency").notNull().default("MYR"),
    /** open | preparing | locked | finalized | posted */
    state: text("state").notNull().default("open"),
    lockedByUserId: text("lockedByUserId"),
    lockedAt: timestamp("lockedAt", { mode: "date" }),
    /** Workflow DevKit run id set when finalization durable run starts. */
    finalizedRunId: text("finalizedRunId"),
    /** Composite rule pack version snapshot — e.g. "MY-2026-01". Null until period locks. */
    rulePackVersion: text("rulePackVersion"),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_payroll_period_org_start_end_uidx").on(
      t.organizationId,
      t.periodStart,
      t.periodEnd
    ),
    index("hrm_payroll_period_org_state_idx").on(t.organizationId, t.state),
    index("hrm_payroll_period_org_start_idx").on(
      t.organizationId,
      t.periodStart
    ),
  ]
)

/** One payroll computation run per (period, employee). Idempotent via inputDigest.
 *  State: draft → computed → locked. overridden = bureau import path (Phase 4+).
 */
export const hrmPayrollRun = pgTable(
  "hrm_payroll_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    periodId: text("periodId")
      .notNull()
      .references(() => hrmPayrollPeriod.id, { onDelete: "restrict" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    /** Contract version active at period end — snapshotted for re-runnable history. */
    contractId: text("contractId").references(() => hrmEmploymentContract.id, {
      onDelete: "restrict",
    }),
    /** Payroll profile active at period end — snapshotted for re-runnable history. */
    profileId: text("profileId").references(() => hrmPayrollProfile.id, {
      onDelete: "restrict",
    }),
    /** draft | computed | locked | overridden */
    state: text("state").notNull().default("draft"),
    grossPay: decimal("grossPay", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    netPay: decimal("netPay", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    employerCost: decimal("employerCost", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    /** SHA-256 of all inputs — recompute only when digest changes. */
    inputDigest: text("inputDigest"),
    computedAt: timestamp("computedAt", { mode: "date" }),
    computedByUserId: text("computedByUserId"),
    /** True when lines were imported from an external bureau rather than computed. */
    overriddenFromBureau: boolean("overriddenFromBureau")
      .notNull()
      .default(false),
    bureauReference: text("bureauReference"),
    /** Array of ValidationIssue objects from rule-pack validateProfile(). */
    validationIssues: jsonb("validationIssues")
      .$type<Array<{ code: string; message: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_payroll_run_org_period_employee_uidx").on(
      t.organizationId,
      t.periodId,
      t.employeeId
    ),
    index("hrm_payroll_run_org_period_state_idx").on(
      t.organizationId,
      t.periodId,
      t.state
    ),
    index("hrm_payroll_run_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
  ]
)

/** Granular earning / deduction line for per-line rule-pack traceability.
 *  Provenance field cites the exact composite manifest + per-statutory sub-version
 *  that produced each line — enables byte-identical historical re-runs.
 */
export const hrmPayrollLine = pgTable(
  "hrm_payroll_line",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    runId: text("runId")
      .notNull()
      .references(() => hrmPayrollRun.id, { onDelete: "cascade" }),
    /** earning | employee_deduction | employer_contribution | tax | adjustment | validation_issue */
    lineKind: text("lineKind").notNull(),
    /** Canonical code: BASIC, EPF_EE, EPF_ER, SOCSO_EE, SOCSO_ER, EIS_EE, EIS_ER, PCB, etc. */
    code: text("code").notNull(),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    /** Rule-pack provenance: { compositePack, subVersion, table, rowId, categoryCode }. */
    rulePackProvenance:
      jsonb("rulePackProvenance").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    /**
     * Phase 4: optional FK to the `hrm_claim` row this earning settled.
     * Populated by `payroll-finalize.workflow.ts` when an approved unpaid
     * claim falls inside the period — payroll-line carries the claimId so
     * idempotent re-finalization can detect already-paid claims and skip
     * them. Nullable because most lines (BASIC, EPF_EE, PCB, …) have no
     * claim provenance. ON DELETE SET NULL preserves the audit ledger.
     */
    claimId: text("claimId"),
    /** Optional FK when this deduction line repays an approved salary advance. */
    salaryAdvanceId: text("salaryAdvanceId").references(
      () => hrmSalaryAdvance.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hrm_payroll_line_run_id_idx").on(t.runId),
    index("hrm_payroll_line_org_run_kind_idx").on(
      t.organizationId,
      t.runId,
      t.lineKind
    ),
    index("hrm_payroll_line_org_run_code_idx").on(
      t.organizationId,
      t.runId,
      t.code
    ),
    index("hrm_payroll_line_claim_id_idx").on(t.claimId),
    index("hrm_payroll_line_salary_advance_id_idx").on(t.salaryAdvanceId),
  ]
)

// ---------------------------------------------------------------------------
// Phase 4 — Claims (reimbursable expense workflow)
//
// Tables:
//   hrm_claim_type        per-org claim catalog (Travel / Medical / Phone / …)
//   hrm_claim             one claim row per submission (state machine)
//   hrm_claim_evidence    claim ↔ hrm_document linkage with evidence type
//
// State machine:
//   draft → submitted → approved | rejected     (single-step approval reuses
//                                                hrm_approval(subjectKind=claim))
//   submitted → cancelled                       (employee withdraws)
//   approved → paid                             (payroll-finalize.workflow.ts
//                                                writes hrm_payroll_line.claimId
//                                                + flips claim.state = paid)
//
// Audit grammar: erp.hrm.claim.{submit|cancel|approve|reject|attach_evidence|paid}
// ---------------------------------------------------------------------------

/** Per-org reimbursable claim catalog. Owners pin a default payroll-line code
 *  (e.g. ALLOWANCE_TRAVEL) so payroll-finalize knows where to attach the
 *  earnings line; rule-packs can override per country. */
export const hrmClaimType = pgTable(
  "hrm_claim_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** Stable internal code (UPPER_SNAKE_CASE), e.g. TRAVEL, MEDICAL_OUTPATIENT. */
    code: text("code").notNull(),
    /** Operator-facing label. */
    name: text("name").notNull(),
    description: text("description"),
    /** Default payroll-line code emitted when this claim is paid. */
    defaultPayrollLineCode: text("defaultPayrollLineCode")
      .notNull()
      .default("ALLOWANCE_CLAIM"),
    /** ISO-4217 currency for limits + claim amounts (claim row may override). */
    currency: text("currency").notNull().default("MYR"),
    /** Optional per-claim cap; null = no limit. */
    perClaimLimit: decimal("perClaimLimit", { precision: 15, scale: 2 }),
    /** Whether claims of this type require at least one evidence document. */
    requiresEvidence: boolean("requiresEvidence").notNull().default(true),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_claim_type_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_claim_type_org_active_idx").on(t.organizationId, t.isActive),
  ]
)

export const hrmClaim = pgTable(
  "hrm_claim",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    claimTypeId: text("claimTypeId")
      .notNull()
      .references(() => hrmClaimType.id, { onDelete: "restrict" }),
    /** Date the expense was incurred (drives payroll-period inclusion). */
    claimDate: date("claimDate", { mode: "string" }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    /** ISO-4217; may diverge from the type default for foreign expenses. */
    currency: text("currency").notNull().default("MYR"),
    description: text("description"),
    /** draft | submitted | approved | rejected | cancelled | paid */
    state: text("state").notNull().default("draft"),
    submittedAt: timestamp("submittedAt", { mode: "date" }),
    /** FK to hrm_approval — single-step approval reuses the generic primitive. */
    currentApprovalId: text("currentApprovalId").references(
      () => hrmApproval.id,
      { onDelete: "set null" }
    ),
    decidedByUserId: text("decidedByUserId"),
    decidedAt: timestamp("decidedAt", { mode: "date" }),
    rejectedReason: text("rejectedReason"),
    /** Set by payroll-finalize when claim is paid; FK to the earnings line. */
    paidByPayrollLineId: text("paidByPayrollLineId"),
    paidAt: timestamp("paidAt", { mode: "date" }),
    cancelledAt: timestamp("cancelledAt", { mode: "date" }),
    cancelledReason: text("cancelledReason"),
    /** Pinned policy version (claim-type snapshot) for re-runnable audits. */
    policyVersion: text("policyVersion"),
    /** Operational temporal spine (Past · Now · Next). */
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    audit7w1h: jsonb("audit7w1h"),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_claim_org_employee_state_idx").on(
      t.organizationId,
      t.employeeId,
      t.state
    ),
    index("hrm_claim_org_state_claim_date_idx").on(
      t.organizationId,
      t.state,
      t.claimDate
    ),
    index("hrm_claim_org_paid_line_idx").on(
      t.organizationId,
      t.paidByPayrollLineId
    ),
  ]
)

/** Receipts / invoices / photos attached to a claim. Each row links one claim
 *  to one hrm_document; multiple evidence rows per claim are allowed. */
export const hrmClaimEvidence = pgTable(
  "hrm_claim_evidence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    claimId: text("claimId")
      .notNull()
      .references(() => hrmClaim.id, { onDelete: "cascade" }),
    documentId: text("documentId")
      .notNull()
      .references(() => hrmDocument.id, { onDelete: "restrict" }),
    /** receipt | invoice | photo | other */
    evidenceType: text("evidenceType").notNull().default("receipt"),
    notes: text("notes"),
    uploadedByUserId: text("uploadedByUserId"),
    uploadedAt: timestamp("uploadedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_claim_evidence_claim_document_uidx").on(
      t.claimId,
      t.documentId
    ),
    index("hrm_claim_evidence_org_claim_idx").on(t.organizationId, t.claimId),
  ]
)

// ---------------------------------------------------------------------------
// Phase 4–5 — Benefits catalog + enrollment + qualifying life events
//
// `hrm_benefit` is a per-org catalog row; `hrm_benefit_enrollment` links an
// employee to a benefit. Payroll-line wiring for benefit deductions remains
// a follow-up once payroll preview absorbs recurring benefit costs.
//
// Audit grammar: erp.hrm.benefit.{create|update|archive|enroll} +
// erp.hrm.benefit.enrollment.{activate|waive|terminate} +
// erp.hrm.benefit.life_event.{record|verify}
// ---------------------------------------------------------------------------

export const hrmBenefit = pgTable(
  "hrm_benefit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** medical | dental | optical | wellness | retirement | other */
    benefitKind: text("benefitKind").notNull().default("other"),
    /** Optional granular subtype (e.g. health_insurance, meal_allowance). */
    benefitType: text("benefitType"),
    employerContributionType: text("employerContributionType")
      .notNull()
      .default("none"),
    employerContributionValue: decimal("employerContributionValue", {
      precision: 15,
      scale: 4,
    }),
    employeeContributionType: text("employeeContributionType")
      .notNull()
      .default("none"),
    employeeContributionValue: decimal("employeeContributionValue", {
      precision: 15,
      scale: 4,
    }),
    /** Allowed coverage levels for enrollments (subset of BENEFIT_COVERAGE_LEVELS). */
    coverageLevels: jsonb("coverageLevels").$type<string[]>(),
    waitingPeriodDays: integer("waitingPeriodDays").notNull().default(0),
    maxAnnualAmount: decimal("maxAnnualAmount", {
      precision: 15,
      scale: 2,
    }),
    effectiveFrom: timestamp("effectiveFrom", { mode: "date" }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_benefit_org_code_uidx").on(t.organizationId, t.code),
    index("hrm_benefit_org_active_idx").on(t.organizationId, t.isActive),
  ]
)

export const hrmBenefitEnrollment = pgTable(
  "hrm_benefit_enrollment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    benefitId: text("benefitId")
      .notNull()
      .references(() => hrmBenefit.id, { onDelete: "restrict" }),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    /** pending | active | waived | terminated */
    state: text("state").notNull().default("pending"),
    coverageLevel: text("coverageLevel"),
    effectiveFrom: timestamp("effectiveFrom", { mode: "date" }),
    employerContributionAmount: decimal("employerContributionAmount", {
      precision: 15,
      scale: 2,
    }),
    employeeContributionAmount: decimal("employeeContributionAmount", {
      precision: 15,
      scale: 2,
    }),
    waivedReason: text("waivedReason"),
    enrolledAt: timestamp("enrolledAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    terminatedAt: timestamp("terminatedAt", { mode: "date" }),
    terminationReason: text("terminationReason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_benefit_enrollment_org_benefit_employee_uidx").on(
      t.organizationId,
      t.benefitId,
      t.employeeId
    ),
    index("hrm_benefit_enrollment_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_benefit_enrollment_org_state_idx").on(t.organizationId, t.state),
  ]
)

export const hrmBenefitLifeEvent = pgTable(
  "hrm_benefit_life_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    employeeId: text("employeeId")
      .notNull()
      .references(() => hrmEmployee.id, { onDelete: "restrict" }),
    eventType: text("eventType").notNull(),
    eventDate: timestamp("eventDate", { mode: "date" }).notNull(),
    notes: text("notes"),
    /** pending | verified | rejected */
    verificationStatus: text("verificationStatus").notNull().default("pending"),
    verifiedByUserId: text("verifiedByUserId"),
    verifiedAt: timestamp("verifiedAt", { mode: "date" }),
    verificationNote: text("verificationNote"),
    documentIds: jsonb("documentIds").$type<string[]>().notNull().default([]),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    index("hrm_benefit_life_event_org_employee_idx").on(
      t.organizationId,
      t.employeeId
    ),
    index("hrm_benefit_life_event_org_type_idx").on(
      t.organizationId,
      t.eventType
    ),
  ]
)

/** Global registry of composite payroll rule-pack versions.
 *  No organizationId — global across all tenants.
 *  The actual rule code lives in TypeScript files under
 *  data/rule-packs/<country>/ (PR-reviewed, type-checked, append-only).
 */
/**
 * One row per (org, period, countryCode, packType).
 * Generated by payroll-finalize workflow; reproducible from inputHash + rulePackVersion.
 * Tracks submission state through the statutory delivery pipeline.
 */
export const hrmComplianceEvidence = pgTable(
  "hrm_compliance_evidence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    /** FK to payroll period; null for non-period packs (e.g. annual EA). */
    periodId: text("periodId").references(() => hrmPayrollPeriod.id, {
      onDelete: "restrict",
    }),
    /** ISO-2 country code: MY, SG, ID, TH, VN, PH. */
    countryCode: text("countryCode").notNull(),
    /** Pack type discriminator. */
    packType: text("packType").notNull(),
    /** SHA-256 hex of all input run lines that produced this pack. */
    inputHash: text("inputHash").notNull(),
    /** SHA-256 hex of the generated payload bytes. */
    outputHash: text("outputHash").notNull(),
    /** FK to hrm_document where the payload blob is stored. */
    payloadDocumentId: text("payloadDocumentId").references(
      () => hrmDocument.id,
      { onDelete: "set null" }
    ),
    /** Pinned composite rule-pack version for re-runnable history. */
    rulePackVersion: text("rulePackVersion").notNull(),
    generatedAt: timestamp("generatedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    generatedByUserId: text("generatedByUserId"),
    /** Workflow DevKit run id for durable finalize runs. */
    generatedByRunId: text("generatedByRunId"),
    /** draft | queued | submitted | acknowledged | failed */
    submissionState: text("submissionState").notNull().default("draft"),
    /** FK to org_event_delivery when submitted via outbox. */
    submissionDeliveryId: text("submissionDeliveryId"),
    /** External bureau receipt id (e.g. KWSP acknowledgement number). */
    externalReference: text("externalReference"),
    // ----- Phase 3I: acknowledgement provenance (first-class temporal authority
    // metadata). Populated only on the `submitted -> acknowledged` transition.
    // Future Phase 3J webhook receiver writes the same columns with
    // `acknowledgementSource = 'webhook'` and `acknowledgedByUserId = null`.
    /** When the bureau receipt was recorded (null until acknowledged). */
    acknowledgedAt: timestamp("acknowledgedAt", { mode: "date" }),
    /** Actor who recorded the receipt; null for webhook / system. */
    acknowledgedByUserId: text("acknowledgedByUserId"),
    /** 'manual' | 'webhook' | 'api' | 'import'. App-level enum. */
    acknowledgementSource: text("acknowledgementSource"),
    /**
     * Phase 3J: SHA-256 hex of the bureau's incoming webhook body
     * (canonicalized exactly the way `computePayloadHash` produces it). NULL
     * for manual / future API acknowledgements where there is no bureau-
     * supplied payload to hash. Establishes integrity lineage for disputes.
     */
    authorityPayloadHash: text("authorityPayloadHash"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
  },
  (t) => [
    uniqueIndex("hrm_compliance_evidence_org_period_country_type_uidx").on(
      t.organizationId,
      t.periodId,
      t.countryCode,
      t.packType
    ),
    index("hrm_compliance_evidence_org_state_generated_idx").on(
      t.organizationId,
      t.submissionState,
      t.generatedAt
    ),
  ]
)

export const hrmCountryRulePack = pgTable(
  "hrm_country_rule_pack",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** ISO-2 country code: MY, SG, ID, TH, VN, PH. */
    countryCode: text("countryCode").notNull(),
    /** Composite rule-pack version, e.g. "MY-2026-01". */
    version: text("version").notNull(),
    /** Calendar date from which this composite pack is effective. */
    effectiveFrom: text("effectiveFrom").notNull(), // ISO "YYYY-MM-DD"
    /** Calendar date until which this pack is effective (null = current). */
    effectiveTo: text("effectiveTo"),
    /** Per-statutory sub-versions for audit traceability. */
    manifest: jsonb("manifest")
      .$type<{
        epfVersion: string
        socsoVersion: string
        eisVersion: string
        pcbVersion: string
        hrdfVersion: string | null
        holidayVersion: string
        eaLeaveVersion: string
      }>()
      .notNull(),
    publishedByUserId: text("publishedByUserId"),
    publishedAt: timestamp("publishedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("hrm_country_rule_pack_country_version_uidx").on(
      t.countryCode,
      t.version
    ),
    index("hrm_country_rule_pack_country_effective_from_idx").on(
      t.countryCode,
      t.effectiveFrom
    ),
  ]
)

// ---------------------------------------------------------------------------
// Working Memory Rail (Phase 3a)
//
// Operator memory inside each workbench: pinned records, saved filtered URLs,
// and activity-derived recents. Org-scoped + user-scoped + workbench-scoped.
//
// FK references to `neon_auth.organization` / `neon_auth.user` are omitted
// per the repo convention (see `iamAuditEvent`, `plannerSignal`): cross-schema
// CASCADE is not part of Neon Auth's contract. Application-layer cleanup
// (Phase 3b) ensures consistency when an org or membership is removed.
// ---------------------------------------------------------------------------

/**
 * Per-user pinned record reference shown in the rail's `pinned` slot.
 * One row per (organization, user, workbench, resource) — enforced by
 * `rail_pinned_item_user_resource_uidx`. `resourceType` is a free-form
 * stable tag (e.g. `"hrm_employee"`, `"org_member"`); validation lives
 * at the application layer.
 */
export const railPinnedItem = pgTable(
  "rail_pinned_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    /**
     * Stable workbench identifier (matches the Zod
     * `WorkbenchRailIdentifier` typed union). Free-form `text` at the DB
     * boundary so adding a new workbench is migration-free.
     */
    workbenchId: text("workbenchId").notNull(),
    resourceType: text("resourceType").notNull(),
    resourceId: text("resourceId").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    /** Optional `WorkbenchRailNavIconId` token (validated client-side). */
    icon: text("icon"),
    /** Drag-to-reorder rank (lower = higher in the list). */
    rank: integer("rank").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rail_pinned_item_user_resource_uidx").on(
      t.organizationId,
      t.userId,
      t.workbenchId,
      t.resourceType,
      t.resourceId
    ),
    index("rail_pinned_item_lookup_idx").on(
      t.organizationId,
      t.userId,
      t.workbenchId,
      t.rank
    ),
  ]
)

/**
 * Per-user saved view shown in the rail's `views` slot. The `href` is a
 * filtered URL inside the workbench (e.g.
 * `/o/acme/dashboard/hrm/employees?status=active&grade=L3`).
 */
export const railSavedView = pgTable(
  "rail_saved_view",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    workbenchId: text("workbenchId").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    icon: text("icon"),
    rank: integer("rank").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("rail_saved_view_lookup_idx").on(
      t.organizationId,
      t.userId,
      t.workbenchId,
      t.rank
    ),
  ]
)

/**
 * Activity-derived recents shown in the rail's `recents` slot. Writes are
 * high-frequency and **not** audited via `iam_audit_event` — observability
 * is handled by OTEL counters in the `rail-memory` server module. App-side
 * queries cap surfacing to 5; a nightly cron prunes per-(org,user,workbench)
 * beyond 25.
 */
export const railRecentItem = pgTable(
  "rail_recent_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    workbenchId: text("workbenchId").notNull(),
    resourceType: text("resourceType").notNull(),
    /** Optional — list-level surfaces (e.g. "Members") have no record id. */
    resourceId: text("resourceId"),
    label: text("label").notNull(),
    href: text("href").notNull(),
    icon: text("icon"),
    occurredAt: timestamp("occurredAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("rail_recent_item_lookup_idx").on(
      t.organizationId,
      t.userId,
      t.workbenchId,
      t.occurredAt
    ),
  ]
)

/**
 * Per-org capability policy — Capability Registry governance layer.
 * One row per (organization, capability, audience). `state` is one of
 * `allowed | blocked | mandatory`; `mandatory` and `blocked` are terminal in
 * `resolveCapabilitiesForViewer`. `audience` collapses the role-policy layer:
 * `all` applies to every member, `admin` only to admins/owners, `member` only
 * to non-admins. `capabilityId` is free-form `text` so the catalog can grow
 * without migrations; the application layer validates against the live
 * `CAPABILITY_DEFINITIONS` registry at write time.
 *
 * IDs are FK-less to neon_auth.* for the same reason as `iam_audit_event`.
 */
export const orgCapabilityPolicy = pgTable(
  "org_capability_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    capabilityId: text("capabilityId").notNull(),
    /** `allowed | blocked | mandatory` — validated by Zod at the action boundary. */
    state: text("state").notNull(),
    /** `all | admin | member` — collapses role policy into a single audience filter. */
    audience: text("audience").notNull().default("all"),
    /** User who last set the policy (audit lineage; FK-less per repo convention). */
    updatedBy: text("updatedBy").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_capability_policy_org_capability_audience_uidx").on(
      t.organizationId,
      t.capabilityId,
      t.audience
    ),
    index("org_capability_policy_org_idx").on(t.organizationId),
  ]
)

/**
 * Per-(org, user) capability preference — replaces the previous
 * `localStorage`-only utility-bar visibility persistence with a DB-backed
 * source of truth resolved server-side. `state` is `visible | hidden`;
 * absence means "follow system default". `displayOrder` is reserved for
 * future drag-to-reorder UI (v1 only ships visibility toggles).
 *
 * Unique on (organization, user, capability). IDs are FK-less to neon_auth.*
 * per the same convention as `iam_audit_event` and `rail_pinned_item`.
 */
export const userCapabilityPreference = pgTable(
  "user_capability_preference",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    capabilityId: text("capabilityId").notNull(),
    /** `visible | hidden` — validated by Zod at the action boundary. */
    state: text("state").notNull(),
    displayOrder: integer("displayOrder").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_capability_preference_org_user_capability_uidx").on(
      t.organizationId,
      t.userId,
      t.capabilityId
    ),
    index("user_capability_preference_org_user_idx").on(
      t.organizationId,
      t.userId
    ),
  ]
)

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

/**
 * Org or personal OneThing lists (`onething_list`).
 * Exactly one of `organizationId` / `ownerUserId` is non-null (DB CHECK).
 */
export const oneThingList = pgTable(
  "onething_list",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    shareTokenHash: text("shareTokenHash"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("onething_list_organization_id_idx").on(t.organizationId),
    index("onething_list_owner_user_id_idx").on(t.ownerUserId),
    uniqueIndex("onething_list_org_slug_uidx")
      .on(t.organizationId, t.slug)
      .where(sql`${t.organizationId} IS NOT NULL`),
    uniqueIndex("onething_list_owner_slug_uidx")
      .on(t.ownerUserId, t.slug)
      .where(sql`${t.ownerUserId} IS NOT NULL`),
  ]
)

/**
 * Org or personal OneThing rows (`onething`). The four JSONB spokes — `linkage`,
 * `counterparty`, `provenance`, `impact` — make the row an **operational
 * atom** (`0015_onething_atom.sql`); see `lib/features/onething/types.ts`.
 */
export const oneThing = pgTable(
  "onething",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    listId: text("listId")
      .notNull()
      .references(() => oneThingList.id, { onDelete: "cascade" }),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    assigneeUserId: text("assigneeUserId"),
    title: text("title").notNull(),
    consequence: text("consequence").notNull().default(""),
    state: text("state").notNull().default("detected"),
    severity: text("severity").notNull().default("medium"),
    dueAt: timestamp("dueAt", { mode: "date" }),
    snoozeUntil: timestamp("snoozeUntil", { mode: "date" }),
    recurrenceRule: text("recurrenceRule"),
    parentOneThingId: text("parentOneThingId"),
    position: integer("position").notNull().default(0),
    /**
     * Operational atom — sparse JSONB spokes. The application validates shape
     * with Zod (see `safeParseOneThingSpoke`); the DB stores raw JSON so future
     * migrations can add subkey indexes without breaking older rows.
     */
    linkage: jsonb("linkage"),
    counterparty: jsonb("counterparty"),
    provenance: jsonb("provenance"),
    impact: jsonb("impact"),
    temporalPast: jsonb("temporalPast"),
    temporalNow: jsonb("temporalNow"),
    temporalNext: jsonb("temporalNext"),
    resolvedAt: timestamp("resolvedAt", { mode: "date" }),
    deprecatedAt: timestamp("deprecatedAt", { mode: "date" }),
    resolutionNote: text("resolutionNote"),
    resolutionProof: jsonb("resolutionProof"),
    predictions: jsonb("predictions"),
    /** Trimmed 7W1H audit cache (last N events) — validated in `lib/features/onething`. */
    audit7w1h: jsonb("audit7w1h"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    auditOrigin: text("auditOrigin").notNull().default("production"),
    simulationRunId: text("simulationRunId"),
    scenarioId: text("scenarioId"),
    scenarioVersion: integer("scenarioVersion"),
    simulationSeed: text("simulationSeed"),
  },
  (t) => [
    index("onething_organization_id_state_idx").on(t.organizationId, t.state),
    index("onething_owner_user_id_state_idx").on(t.ownerUserId, t.state),
    index("onething_assignee_user_id_state_idx").on(t.assigneeUserId, t.state),
    index("onething_due_at_idx").on(t.dueAt),
    index("onething_list_id_idx").on(t.listId),
    index("onething_snooze_until_idx").on(t.snoozeUntil),
  ]
)

export const oneThingAttachment = pgTable(
  "onething_attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    oneThingId: text("oneThingId")
      .notNull()
      .references(() => oneThing.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    contentSha256: text("contentSha256").notNull(),
    mimeType: text("mimeType").notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("onething_attachment_onething_id_idx").on(t.oneThingId)]
)

export const oneThingComment = pgTable(
  "onething_comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    oneThingId: text("oneThingId")
      .notNull()
      .references(() => oneThing.id, { onDelete: "cascade" }),
    authorUserId: text("authorUserId").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("onething_comment_onething_id_created_at_idx").on(
      t.oneThingId,
      t.createdAt
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

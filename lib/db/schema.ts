import { sql } from "drizzle-orm"
import {
  boolean,
  date,
  decimal,
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
  },
  (t) => [
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
 * Org or personal task lists (`todo_list` — migration `0014_erp_todos.sql`).
 * Exactly one of `organizationId` / `ownerUserId` is non-null (DB CHECK).
 */
export const todoList = pgTable(
  "todo_list",
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
    index("todo_list_organization_id_idx").on(t.organizationId),
    index("todo_list_owner_user_id_idx").on(t.ownerUserId),
    uniqueIndex("todo_list_org_slug_uidx")
      .on(t.organizationId, t.slug)
      .where(sql`${t.organizationId} IS NOT NULL`),
    uniqueIndex("todo_list_owner_slug_uidx")
      .on(t.ownerUserId, t.slug)
      .where(sql`${t.ownerUserId} IS NOT NULL`),
  ]
)

/** Org or personal todo rows (`todo`). */
export const erpTodo = pgTable(
  "todo",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    listId: text("listId")
      .notNull()
      .references(() => todoList.id, { onDelete: "cascade" }),
    organizationId: text("organizationId"),
    ownerUserId: text("ownerUserId"),
    assigneeUserId: text("assigneeUserId"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    state: text("state").notNull().default("pending"),
    priority: text("priority").notNull().default("normal"),
    dueAt: timestamp("dueAt", { mode: "date" }),
    snoozeUntil: timestamp("snoozeUntil", { mode: "date" }),
    recurrenceRule: text("recurrenceRule"),
    parentTodoId: text("parentTodoId"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("todo_organization_id_state_idx").on(t.organizationId, t.state),
    index("todo_owner_user_id_state_idx").on(t.ownerUserId, t.state),
    index("todo_assignee_user_id_state_idx").on(t.assigneeUserId, t.state),
    index("todo_due_at_idx").on(t.dueAt),
    index("todo_list_id_idx").on(t.listId),
    index("todo_snooze_until_idx").on(t.snoozeUntil),
  ]
)

export const todoAttachment = pgTable(
  "todo_attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    todoId: text("todoId")
      .notNull()
      .references(() => erpTodo.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    contentSha256: text("contentSha256").notNull(),
    mimeType: text("mimeType").notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("todo_attachment_todo_id_idx").on(t.todoId)]
)

export const todoComment = pgTable(
  "todo_comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    todoId: text("todoId")
      .notNull()
      .references(() => erpTodo.id, { onDelete: "cascade" }),
    authorUserId: text("authorUserId").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("todo_comment_todo_id_created_at_idx").on(t.todoId, t.createdAt),
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

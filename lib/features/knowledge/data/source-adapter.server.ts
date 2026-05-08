import "server-only"

import type { ZodType } from "zod"

import type { KnowledgeSourceKind } from "#features/knowledge/constants"
import type { RawKnowledgeDocument } from "#features/knowledge/types"

export type KnowledgeSourceAdapterErrorCode =
  | "auth"
  | "rate_limit"
  | "not_found"
  | "parse"
  | "unknown"

export type KnowledgeSourceAdapterContext = {
  organizationId: string
}

export type KnowledgeSourceAdapter<TConfig extends Record<string, unknown>> = {
  id: KnowledgeSourceKind
  configSchema: ZodType<TConfig>
  listDocuments: (
    ctx: KnowledgeSourceAdapterContext,
    config: TConfig
  ) => AsyncIterable<RawKnowledgeDocument>
}
